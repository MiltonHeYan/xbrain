import type {
  Bookmark,
  BookmarkPatch,
  Enrichment,
  Media,
  ImportResult,
  SourceField,
} from './types.js';
import {isObject as obj} from './types.js';
/** Shared, dependency-free importer. All content remains plain text, never HTML. */
export const MAX_BOOKMARKS = 10000;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_LIBRARY_BOOKMARKS = 50000;
export const MAX_LIBRARY_BYTES = 100 * 1024 * 1024;

const utf8Bytes = (value: string) => new TextEncoder().encode(value).byteLength;
const own = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key);
const text = (value: unknown, max = 20000) =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max)
    : '';
const date = (value: unknown) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;

export function safeUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

function unwrap(input: unknown, maxBytes = MAX_IMPORT_BYTES) {
  for (let depth = 0; depth < 5; depth++) {
    if (typeof input === 'string') {
      if (utf8Bytes(input) > maxBytes)
        throw new Error(`JSON exceeds ${maxBytes / 1024 / 1024} MiB.`);
      input = JSON.parse(input);
      continue;
    }
    if (obj(input) && (input.isError === true || input.error)) {
      throw new Error('The tool returned an error; reconnect or resolve it before importing.');
    }
    if (obj(input) && input.structuredContent) {
      input = input.structuredContent;
      continue;
    }
    if (obj(input) && Array.isArray(input.content)) {
      const blocks = input.content.filter(
        (block: unknown): block is {type: 'text'; text: string} =>
          obj(block) && block.type === 'text' && typeof block.text === 'string',
      );
      if (blocks.length !== 1) throw new Error('Expected one JSON text tool result.');
      input = blocks[0]!.text;
      continue;
    }
    return input;
  }
  throw new Error('Import wrapper nesting is too deep.');
}

export function normalizeImport(input: unknown): ImportResult {
  return normalizeRows(unwrap(input), MAX_BOOKMARKS);
}

/** Restore only explicit v1 collection envelopes; never infer that an X snapshot is complete. */
export function normalizeLibrary(input: unknown): ImportResult {
  const root = unwrap(input, MAX_LIBRARY_BYTES);
  if (
    !obj(root) ||
    !Array.isArray(root.bookmarks) ||
    (root.version !== 1 && root.schemaVersion !== 1) ||
    (own(root, 'version') && root.version !== 1) ||
    (own(root, 'schemaVersion') && root.schemaVersion !== 1)
  ) {
    throw new Error('Expected a version 1 library backup with a bookmarks array.');
  }
  const result = normalizeRows(root, MAX_LIBRARY_BOOKMARKS);
  if (result.bookmarks.length !== root.bookmarks.length) {
    throw new Error('Invalid or duplicate bookmark IDs in library backup; collection unchanged.');
  }
  return result;
}

function normalizeRows(input: unknown, maxBookmarks: number): ImportResult {
  const root = obj(input) ? input : {};
  const meta = obj(root.meta) ? root.meta : {};
  const includes = obj(root.includes) ? root.includes : {};
  const rows = Array.isArray(input)
    ? input
    : Array.isArray(root?.bookmarks)
      ? root.bookmarks
      : Array.isArray(root?.data)
        ? root.data
        : meta.result_count === 0
          ? []
          : null;
  if (!rows)
    throw new Error('Expected a bookmark array, {bookmarks}, or X {data, includes} response.');
  if (rows.length > maxBookmarks) {
    throw new Error(
      `Import exceeds ${maxBookmarks.toLocaleString('en-US')} bookmarks. Split it into smaller files.`,
    );
  }
  const warnings = [
    'This import is a partial snapshot; absence from it never deletes an existing bookmark.',
  ];
  if (meta.next_token) {
    warnings.push(
      'More results exist. The CoreSpeed schema checked on 2026-10-02 has no pagination argument; this import is incomplete.',
    );
  }
  const users = new Map(
    (Array.isArray(includes.users) ? includes.users : [])
      .filter(obj)
      .map((user) => [String(user.id), user]),
  );
  const mediaMap = new Map(
    (Array.isArray(includes.media) ? includes.media : [])
      .filter(obj)
      .map((media) => [media.media_key, media]),
  );
  const result = new Map<string, Bookmark>();
  const now = new Date().toISOString();

  rows.forEach((row, index) => {
    if (!obj(row)) {
      warnings.push(`Row ${index + 1}: skipped invalid object.`);
      return;
    }
    // Legacy X payloads can contain a rounded numeric id alongside a precise id_str.
    const rawId = row.id_str ?? row.id ?? row.tweet_id;
    const id = typeof rawId === 'string' ? rawId : Number.isSafeInteger(rawId) ? String(rawId) : '';
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
      warnings.push(`Row ${index + 1}: skipped invalid or unsafe ID; use string IDs.`);
      return;
    }
    const authorPresent = obj(row.author) || obj(row.user) || users.has(String(row.author_id));
    const author = obj(row.author)
      ? row.author
      : obj(row.user)
        ? row.user
        : (users.get(String(row.author_id)) ?? {});
    const username = text(author.username ?? author.screen_name, 30).replace(/^@/, '');
    const handle = /^[A-Za-z0-9_]{1,15}$/.test(username) ? username : '';
    const fallback = /^\d+$/.test(id) ? `https://x.com/${handle || 'i'}/status/${id}` : '';
    const tags = Array.isArray(row.tags)
      ? [
          ...new Set(
            row.tags
              .filter((tag) => typeof tag === 'string')
              .map((tag) => text(tag, 60).trim())
              .filter(Boolean),
          ),
        ].slice(0, 30)
      : [];
    const summary = text(row.summary, 4000);
    const supplied = obj(row.enrichment) ? row.enrichment : {};
    const agent = text(supplied.agent, 120).trim();
    const isAgent = supplied.kind === 'agent' && agent && date(supplied.generatedAt);
    const enrichment: Enrichment =
      supplied.kind === 'user'
        ? {kind: 'user'}
        : isAgent
          ? {
              kind: 'agent',
              agent,
              generatedAt: date(supplied.generatedAt)!,
              basis: text(supplied.basis, 200) || 'Imported post text',
            }
          : {kind: summary || tags.length ? 'imported' : 'none'};
    const extended = obj(row.extended_tweet) ? row.extended_tweet : {};
    const attachments = obj(row.attachments) ? row.attachments : {};
    const sourceFields = obj(row.sourceFields) ? row.sourceFields : {};
    const postText = extended.full_text ?? row.full_text ?? row.text;
    const rawMedia = Array.isArray(row.media)
      ? row.media
      : Array.isArray(attachments.media_keys)
        ? attachments.media_keys.map((key) => mediaMap.get(key)).filter(Boolean)
        : [];
    const media: Media[] = rawMedia
      .slice(0, 8)
      .filter(obj)
      .map(
        (item): Media => ({
          url: safeUrl(item.url ?? item.preview_image_url),
          type: item.type === 'video' && safeUrl(item.url) ? 'video' : 'image',
          alt: text(item.alt ?? item.alt_text, 500),
        }),
      )
      .filter((item) => item.url);
    const bookmark: Bookmark = {
      id,
      text: text(postText),
      author: {name: text(author.name, 200) || handle || 'Unknown author', username: handle},
      url: safeUrl(row.url) || fallback,
      createdAt: date(row.createdAt ?? row.created_at),
      savedAt: date(row.savedAt) || now,
      tags,
      summary,
      media,
      enrichment,
      sourceFields: {
        text:
          typeof sourceFields.text === 'boolean' ? sourceFields.text : typeof postText === 'string',
        url: typeof sourceFields.url === 'boolean' ? sourceFields.url : Boolean(safeUrl(row.url)),
        author:
          typeof sourceFields.author === 'boolean' ? sourceFields.author : Boolean(authorPresent),
        media:
          typeof sourceFields.media === 'boolean'
            ? sourceFields.media
            : Array.isArray(row.media) ||
              (Array.isArray(attachments.media_keys) &&
                attachments.media_keys.every((key) => mediaMap.has(key))),
      },
    };
    if (own(row, 'note')) bookmark.note = text(row.note, 10000);
    if (typeof row.favorite === 'boolean') bookmark.favorite = row.favorite;
    if (result.has(id))
      warnings.push(`Row ${index + 1}: duplicate ID replaced within this import.`);
    result.set(id, bookmark);
  });
  return {
    bookmarks: [...result.values()],
    warnings,
    source: {provider: 'x', via: 'corespeed-or-json', coverage: 'partial'},
  };
}

export function mergeBookmarks(existing: Bookmark[], incoming: Bookmark[]): Bookmark[] {
  if (!Array.isArray(existing) || !Array.isArray(incoming))
    throw new Error('Expected bookmark arrays.');
  const all = new Map(existing.map((bookmark) => [bookmark.id, bookmark]));
  for (const bookmark of incoming) {
    const previous = all.get(bookmark.id);
    if (!previous) {
      all.set(bookmark.id, bookmark);
      continue;
    }
    // Local edits win. Fresh source content still updates text/author/media.
    const merged = {...previous, ...bookmark, savedAt: previous.savedAt || bookmark.savedAt};
    if (bookmark.sourceFields?.text === false) merged.text = previous.text;
    if (!bookmark.createdAt) merged.createdAt = previous.createdAt || null;
    if (bookmark.sourceFields?.author === false) merged.author = previous.author;
    if (
      bookmark.sourceFields?.url === false &&
      (previous.sourceFields?.url === true || bookmark.sourceFields?.author === false)
    ) {
      merged.url = previous.url || bookmark.url;
    }
    if (bookmark.sourceFields?.media === false) merged.media = previous.media;
    merged.sourceFields = {};
    for (const key of ['text', 'url', 'author', 'media'] satisfies SourceField[]) {
      merged.sourceFields[key] =
        bookmark.sourceFields?.[key] === false
          ? (previous.sourceFields?.[key] ?? key !== 'url')
          : (bookmark.sourceFields?.[key] ?? true);
    }
    if (own(previous, 'note')) merged.note = previous.note;
    if (own(previous, 'favorite')) merged.favorite = previous.favorite;
    const rawPrevious =
      previous.enrichment?.kind === 'none' && !previous.tags?.length && !previous.summary;
    if (!rawPrevious) {
      if (own(previous, 'tags')) merged.tags = previous.tags;
      if (own(previous, 'summary')) merged.summary = previous.summary;
      if (own(previous, 'enrichment')) merged.enrichment = previous.enrichment;
    }
    all.set(bookmark.id, merged);
  }
  if (all.size > MAX_LIBRARY_BOOKMARKS)
    throw new Error('Library exceeds the 50,000 bookmark limit.');
  return [...all.values()];
}

/** The same edit validation is used by the local API and standalone browser. */
export function normalizeBookmarkPatch(patch: unknown): BookmarkPatch {
  if (!obj(patch)) throw new Error('Invalid bookmark update.');
  const result: BookmarkPatch = {};
  const allowed = new Set(['tags', 'summary', 'note', 'favorite', 'enrichment']);
  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) throw new Error(`Unsupported bookmark field: ${key}`);
  }
  if (own(patch, 'tags')) {
    if (!Array.isArray(patch.tags) || patch.tags.some((tag) => typeof tag !== 'string'))
      throw new Error('Tags must be strings.');
    result.tags = [...new Set(patch.tags.map((tag) => text(tag, 60).trim()).filter(Boolean))].slice(
      0,
      30,
    );
  }
  for (const [key, max] of [
    ['summary', 4000],
    ['note', 10000],
  ] as const) {
    if (own(patch, key)) {
      if (typeof patch[key] !== 'string') throw new Error(`${key} must be a string.`);
      result[key] = text(patch[key], max);
    }
  }
  if (own(patch, 'favorite')) {
    if (typeof patch.favorite !== 'boolean') throw new Error('Favorite must be boolean.');
    result.favorite = patch.favorite;
  }
  if (
    own(patch, 'enrichment') &&
    (!obj(patch.enrichment) ||
      patch.enrichment.kind !== 'user' ||
      Object.keys(patch.enrichment).some((key) => key !== 'kind'))
  ) {
    throw new Error('Edits can only use user enrichment provenance.');
  }
  if (own(result, 'tags') || own(result, 'summary') || own(patch, 'enrichment'))
    result.enrichment = {kind: 'user'};
  return result;
}
