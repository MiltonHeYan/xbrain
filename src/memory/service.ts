import {digest, searchResources, validateResource} from './model.js';
import type {Resource} from './model.js';
import {readMemory, updateMemory} from './store.js';
import type {MemoryData} from './store.js';
import type {MemoryProvider} from './provider.js';
import {errorMessage} from '../shared/types.js';

export function applyResources(data: MemoryData, resources: Resource[]) {
  let added = 0,
    updated = 0,
    unchanged = 0;
  for (const resource of resources) {
    const old = data.resources.find((r) => r.id === resource.id);
    const deleted = data.tombstones.find((r) => r.id === resource.id);
    if (
      (old && resource.updatedAt < old.updatedAt) ||
      (deleted && resource.updatedAt <= deleted.deletedAt)
    )
      throw new Error('Stale resource; use a newer updatedAt to update or explicitly restore it.');
    if (old && digest(old) === digest(resource)) {
      unchanged++;
      continue;
    }
    if (old && resource.updatedAt === old.updatedAt)
      throw new Error('Conflicting resource revision; use a newer updatedAt.');
    if (old) updated++;
    else added++;
    data.resources = [...data.resources.filter((r) => r.id !== resource.id), resource];
    data.tombstones = data.tombstones.filter((r) => r.id !== resource.id);
  }
  return {added, updated, unchanged, total: data.resources.length, remoteSync: 'not_attempted'};
}
export async function putResources(store: string, inputs: unknown[]) {
  if (!inputs.length || inputs.length > 1000)
    throw new Error('Supply 1–1,000 resources per batch.');
  const resources = inputs.map(validateResource);
  if (new Set(resources.map((r) => r.id)).size !== resources.length)
    throw new Error('Duplicate source IDs in batch.');
  return updateMemory(store, (data) => applyResources(data, resources));
}
export async function deleteResource(store: string, id: string) {
  return updateMemory(store, (data) => {
    const old = data.resources.find((r) => r.id === id);
    if (!old) return {deleted: false, remoteSync: 'not_attempted'};
    data.resources = data.resources.filter((r) => r.id !== id);
    delete data.ingestion.pending[id];
    data.tombstones.push({
      id,
      deletedAt: new Date(Math.max(Date.now(), Date.parse(old.updatedAt) + 1)).toISOString(),
    });
    return {deleted: true, remoteSync: 'pending_explicit_sync'};
  });
}
export async function syncResources(
  store: string,
  provider: MemoryProvider,
  selection: 'all' | string,
) {
  return updateMemory(store, async (data) => {
    const entries = [
      ...data.resources.map((resource) => ({
        id: resource.id,
        revision: digest(resource),
        resource,
      })),
      ...data.tombstones.map((t) => ({id: t.id, revision: digest(t), resource: undefined})),
    ].filter((r) => selection === 'all' || r.id === selection);
    if (selection !== 'all' && !entries.length) throw new Error('Resource not found.');
    const receipts = (data.receipts[provider.key] ??= {});
    let skippedPending = 0;
    let confirmed = 0,
      unchanged = 0;
    const failures: {id: string; error: string}[] = [];
    for (const entry of entries) {
      if (entry.resource && data.ingestion.pending[entry.id]) {
        skippedPending++;
        continue;
      }
      if (receipts[entry.id] === entry.revision) {
        unchanged++;
        continue;
      }
      try {
        if (entry.resource) await provider.upsert(entry.resource, entry.revision);
        else await provider.delete(entry.id, entry.revision);
        receipts[entry.id] = entry.revision;
        confirmed++;
      } catch (error) {
        failures.push({id: entry.id, error: errorMessage(error)});
      }
    }
    return {
      provider: provider.kind,
      confirmed,
      unchanged,
      failures,
      skippedPending,
      remoteSync: skippedPending
        ? 'blocked_pending_distillation'
        : failures.length
          ? 'incomplete'
          : 'confirmed_for_selection',
    };
  });
}
export async function status(store: string, provider?: MemoryProvider) {
  const data = await readMemory(store);
  const revisions = [
    ...data.resources.map((r) => [r.id, digest(r)]),
    ...data.tombstones.map((t) => [t.id, digest(t)]),
  ];
  const pending = provider
    ? revisions.filter(([id, rev]) => data.receipts[provider.key]?.[id!] !== rev).length
    : revisions.length;
  return {
    resources: data.resources.length,
    tombstones: data.tombstones.length,
    pendingDistillation: Object.keys(data.ingestion.pending).length,
    resumableSources: Object.values(data.ingestion.sources).filter((s) => s.active).length,
    provider: provider?.kind ?? null,
    pending,
    remoteSync: !provider ? 'not_configured' : pending ? 'pending' : 'last_sync_confirmed',
    note: 'Local data remains usable. Receipts record past acknowledgements, not a live remote health check.',
  };
}
export async function search(
  store: string,
  query: string,
  limit: number,
  provider?: MemoryProvider,
) {
  const data = await readMemory(store);
  const candidates = new Map(data.resources.map((r) => [r.id, r]));
  if (provider) {
    const hidden = new Set(data.tombstones.map((t) => t.id));
    for (const resource of await provider.search(query, limit)) {
      if (!hidden.has(resource.id) && !candidates.has(resource.id))
        candidates.set(resource.id, resource);
    }
  }
  return {
    mode: 'lexical_candidates',
    provider: provider?.kind ?? null,
    results: searchResources([...candidates.values()], query, limit),
    guidance:
      'Check applicability, limitations and freshness. Cite original source URLs only when used. No relevant match means no recommendation.',
  };
}
