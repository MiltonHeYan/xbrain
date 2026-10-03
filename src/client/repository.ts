import {
  mergeBookmarks,
  normalizeBookmarkPatch,
  normalizeImport,
  normalizeLibrary,
  MAX_IMPORT_BYTES,
} from '../shared/bookmarks.js';
import {isObject} from '../shared/types.js';
import type {Bookmark, BookmarkPatch} from '../shared/types.js';

// Retain the original key: no migration or clearing of existing browser libraries.
export const STORAGE_KEY = 'commonplace.library.v1';
async function request(url: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {...options, signal: AbortSignal.timeout(10000)});
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('The local app returned an unreadable response. Nothing has been overwritten.');
  }
  if (!response.ok)
    throw new Error(
      isObject(data) && typeof data.error === 'string'
        ? data.error
        : 'The local app could not complete this request.',
    );
  return data;
}
export class LibraryRepository {
  mode: 'server' | 'browser' = 'server';
  async load(): Promise<{bookmarks: Bookmark[]; showSamples: boolean}> {
    const response = await fetch('/api/bookmarks', {signal: AbortSignal.timeout(5000)});
    const json = response.headers.get('content-type')?.includes('application/json');
    // Vite/static hosts may return HTML for a missing API route. Network and API failures never fall back.
    if (response.status !== 404 && (!response.ok || json)) {
      const data: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          isObject(data) && typeof data.error === 'string'
            ? data.error
            : 'Your local library could not be opened.',
        );
      const bookmarks = normalizeLibrary(data).bookmarks;
      this.mode = 'server';
      return {bookmarks, showSamples: false};
    }
    if (!response.ok && response.status !== 404)
      throw new Error('Your local library could not be opened.');
    this.mode = 'browser';
    const saved = localStorage.getItem(STORAGE_KEY);
    return {
      bookmarks: saved === null ? [] : normalizeLibrary(saved).bookmarks,
      showSamples: saved === null,
    };
  }
  private save(bookmarks: Bookmark[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, bookmarks}));
    } catch {
      throw new Error(
        'Browser storage is full or unavailable. No changes were saved. Export a backup or use the local app.',
      );
    }
  }
  async import(
    raw: string,
    current: Bookmark[],
  ): Promise<{bookmarks: Bookmark[]; warnings: string[]; received: number}> {
    if (!raw.trim()) throw new Error('Choose a JSON file or paste your bookmark export first.');
    if (new TextEncoder().encode(raw).byteLength > MAX_IMPORT_BYTES)
      throw new Error('Import must be smaller than 10 MiB.');
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new Error('This isn’t valid JSON. Check the file or pasted content and try again.');
    }
    if (isObject(input) && isObject(input.source) && input.source.demo === true)
      throw new Error(
        'This is a sample export. Explore the sample collection separately, or import your own bookmarks.',
      );
    const parsed = normalizeImport(input);
    if (!parsed.bookmarks.length)
      throw new Error('No valid bookmarks found. Your current collection has not changed.');
    if (this.mode === 'server') {
      const result = await request('/api/import', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(input),
      });
      return {
        bookmarks: normalizeLibrary(result).bookmarks,
        warnings:
          isObject(result) && Array.isArray(result.warnings)
            ? result.warnings.filter((x): x is string => typeof x === 'string')
            : parsed.warnings,
        received: parsed.bookmarks.length,
      };
    }
    const bookmarks = mergeBookmarks(current, parsed.bookmarks);
    this.save(bookmarks);
    return {bookmarks, warnings: parsed.warnings, received: parsed.bookmarks.length};
  }
  async update(id: string, fields: BookmarkPatch, current: Bookmark[]): Promise<Bookmark> {
    const patch = normalizeBookmarkPatch(fields);
    const bookmark = current.find((b) => b.id === id);
    if (!bookmark) throw new Error('Bookmark not found.');
    if (this.mode === 'server') {
      const result = await request('/api/bookmarks/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(patch),
      });
      if (!isObject(result) || !isObject(result.bookmark) || result.bookmark.id !== id)
        throw new Error('Invalid bookmark response.');
      return normalizeLibrary({version: 1, bookmarks: [result.bookmark]}).bookmarks[0]!;
    }
    const next = {...bookmark, ...patch};
    this.save(current.map((b) => (b.id === id ? next : b)));
    return next;
  }
}
export function exportLibrary(bookmarks: Bookmark[], demo: boolean): void {
  const blob = new Blob(
    [
      JSON.stringify(
        {version: 1, source: {provider: 'x', coverage: 'partial', demo}, bookmarks},
        null,
        2,
      ),
    ],
    {type: 'application/json'},
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = demo ? 'xstash-synthetic-demo.json' : 'xstash-bookmarks.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
