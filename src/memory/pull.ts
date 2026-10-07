import {canonicalSourceUrl} from '../shared/bookmarks.js';
import {digest, resourceId, validateResource} from './model.js';
import {readMemory, updateMemory} from './store.js';
import {applyResources} from './service.js';
import {errorMessage, isObject} from '../shared/types.js';
import type {BookmarkSource} from './source.js';
import type {SourceProgress} from './ingestion-state.js';

const nextTime = (previous?: string) =>
  new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();

export async function pullResources(
  store: string,
  source: BookmarkSource,
  maxPages = 10,
  restart = false,
) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100)
    throw new Error('max-pages must be 1–100.');
  const totals = {
    pages: 0,
    received: 0,
    added: 0,
    updated: 0,
    unchanged: 0,
    skippedDeleted: 0,
    skippedOlder: 0,
  };
  let coverage: 'full' | 'partial' = 'partial';
  try {
    for (let index = 0; index < maxPages; index++) {
      const before = (await readMemory(store)).ingestion.sources[source.key];
      const progress: SourceProgress =
        before?.active && !(restart && index === 0)
          ? before
          : {
              generation: before?.generation ?? 0,
              active: true,
              cursor: null,
              checkpoint: before?.checkpoint ?? null,
              seen: [],
              coverage: 'full',
            };
      // Fetch outside the mutation lock. A disconnected Agent can replay the last uncommitted page.
      const page = await source.fetch(progress.cursor, progress.checkpoint);
      if (
        page.nextCursor !== null &&
        (page.nextCursor === progress.cursor || progress.seen.includes(digest(page.nextCursor)))
      )
        throw new Error('Repeated pagination cursor; page not committed.');
      const pageCounts = await updateMemory(store, (data) => {
        if (digest(data.ingestion.sources[source.key]) !== digest(before))
          throw new Error('Another pull advanced this source; retry from its committed progress.');
        const counts = {
          received: page.items.length,
          added: 0,
          updated: 0,
          unchanged: 0,
          skippedDeleted: 0,
          skippedOlder: 0,
        };
        const unique = new Map<string, string>();
        for (const item of page.items) {
          const id = resourceId(source.provider, item.id);
          const content = {
            provider: source.provider,
            id: item.id,
            title: item.title,
            text: item.text,
            url: canonicalSourceUrl(source.provider, item.id, item.url),
          };
          const revision = digest(content);
          if (unique.has(id)) {
            if (unique.get(id) !== digest(item))
              throw new Error('Conflicting duplicate source items; page not committed.');
            counts.unchanged++;
            continue;
          }
          unique.set(id, digest(item));
          if (data.tombstones.some((t) => t.id === id)) {
            counts.skippedDeleted++;
            continue;
          }
          const captured = data.ingestion.captures[id];
          const old = data.resources.find((r) => r.id === id);
          // A first pull may follow put/capture. Attach provenance without rewriting
          // unchanged source content, custom titles, analysis or distillation state.
          const sameContent =
            old &&
            old.text === item.text &&
            old.source.url === content.url &&
            (!captured || captured.title === undefined || captured.title === item.title);
          if (captured?.updatedAt && item.updatedAt && item.updatedAt < captured.updatedAt) {
            counts.skippedOlder++;
            continue;
          }
          if (
            captured?.updatedAt &&
            item.updatedAt === captured.updatedAt &&
            captured.revision !== revision &&
            !sameContent
          )
            throw new Error('Conflicting source version; page not committed.');
          if (captured?.revision === revision || sameContent) {
            data.ingestion.captures[id] = {
              revision,
              updatedAt: item.updatedAt ?? captured?.updatedAt ?? null,
              title: item.title,
            };
            const pending = data.ingestion.pending[id];
            if (pending) pending.sourceRevision = revision;
            counts.unchanged++;
            continue;
          }
          const resource = validateResource({
            source: {provider: source.provider, id: item.id, url: item.url},
            title: old && old.title !== captured?.title ? old.title : item.title,
            text: item.text,
            summary: old?.summary ?? '',
            purpose: old?.purpose ?? '',
            useWhen: old?.useWhen ?? [],
            limitations: [
              ...new Set([
                ...(old?.limitations ?? []),
                'Source fetched or changed; Agent distillation is pending.',
              ]),
            ],
            ...(old?.design
              ? {
                  design: {
                    ...old.design,
                    status: 'stale',
                    reason: 'Source changed; inspect images again before relying on this analysis.',
                  },
                }
              : {}),
            savedReason: old?.savedReason ?? null,
            updatedAt: nextTime(old?.updatedAt),
          });
          const result = applyResources(data, [resource]);
          counts.added += result.added;
          counts.updated += result.updated;
          data.ingestion.captures[id] = {revision, updatedAt: item.updatedAt, title: item.title};
          data.ingestion.pending[id] = {sourceKey: source.key, sourceRevision: revision};
        }
        coverage =
          progress.coverage === 'partial' || page.coverage === 'partial' ? 'partial' : 'full';
        data.ingestion.sources[source.key] = {
          generation: (before?.generation ?? 0) + 1,
          active: page.nextCursor !== null,
          cursor: page.nextCursor,
          checkpoint: page.nextCursor === null ? page.checkpoint : progress.checkpoint,
          seen: page.nextCursor === null ? [] : [...progress.seen, digest(page.nextCursor)],
          coverage,
        };
        return counts;
      });
      totals.pages++;
      for (const key of [
        'received',
        'added',
        'updated',
        'unchanged',
        'skippedDeleted',
        'skippedOlder',
      ] as const)
        totals[key] += pageCounts[key];
      if (page.nextCursor === null)
        return {
          ...totals,
          state: 'complete',
          coverage,
          sourceKey: source.key,
          remoteSync: 'not_attempted',
        };
    }
    return {
      ...totals,
      state: 'paused',
      coverage,
      sourceKey: source.key,
      remoteSync: 'not_attempted',
      note: 'Page budget reached. Repeat the same command to resume.',
    };
  } catch (error) {
    return {
      ...totals,
      state: 'failed',
      coverage,
      sourceKey: source.key,
      remoteSync: 'not_attempted',
      error: errorMessage(error),
      note: 'Committed pages are preserved; retry the same command. No missing item was deleted.',
    };
  }
}

export async function pendingDistillation(store: string, limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('limit must be 1–100.');
  const data = await readMemory(store);
  const entries = Object.entries(data.ingestion.pending).filter(([id]) =>
    data.resources.some((r) => r.id === id),
  );
  return {
    pending: entries.length,
    items: entries.slice(0, limit).map(([id, pending]) => {
      const resource = data.resources.find((r) => r.id === id)!;
      return {
        id,
        sourceRevision: pending.sourceRevision,
        resourceRevision: digest(resource),
        resource,
      };
    }),
  };
}

/** Agent-authored refinement, guarded against both newer source content and concurrent local edits. */
export async function distillResources(store: string, input: unknown) {
  const entries = Array.isArray(input) ? input : [input];
  if (!entries.length || entries.length > 100)
    throw new Error('Distill 1–100 resources at a time.');
  return updateMemory(store, (data) => {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (!isObject(entry) || typeof entry.id !== 'string' || seen.has(entry.id))
        throw new Error('Invalid or duplicate distillation item.');
      seen.add(entry.id);
      const pending = data.ingestion.pending[entry.id];
      const resource = data.resources.find((r) => r.id === entry.id);
      if (
        !resource ||
        !pending ||
        pending.sourceRevision !== entry.sourceRevision ||
        digest(resource) !== entry.resourceRevision
      )
        throw new Error('Stale distillation; re-read pending resources before updating.');
      // Identity, source text and a previously stated save reason cannot be rewritten by generated distillation.
      const next = validateResource({
        ...resource,
        summary: entry.summary,
        purpose: entry.purpose,
        useWhen: entry.useWhen,
        limitations: entry.limitations,
        updatedAt: nextTime(resource.updatedAt),
      });
      applyResources(data, [next]);
      delete data.ingestion.pending[entry.id];
    }
    return {
      distilled: entries.length,
      pending: Object.keys(data.ingestion.pending).length,
      remoteSync: 'not_attempted',
    };
  });
}
