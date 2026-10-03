import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeImport, normalizeLibrary, normalizeBookmarkPatch, mergeBookmarks, safeUrl, MAX_IMPORT_BYTES, MAX_LIBRARY_BOOKMARKS} from '../lib/bookmarks.mjs';

const row = {id: '1900000000000000001', text: 'Synthetic post', author: {name: 'Example', username: 'example'}};
const normalized = value => normalizeImport([value]).bookmarks[0];

test('precise legacy id_str wins over an already rounded numeric ID', () => {
  const bookmark = normalized({...row, id: Number(row.id), id_str: row.id});
  assert.equal(bookmark.id, row.id);
  assert.equal(normalized({...row, id: 42}).id, '42');
});

test('full and extended post text wins over truncated legacy text', () => {
  assert.equal(normalized({...row, text: 'Truncated…', full_text: 'Complete post'}).text, 'Complete post');
  assert.equal(normalized({...row, full_text: 'Truncated…', extended_tweet: {full_text: 'Longest post'}}).text, 'Longest post');
});

test('source and annotation strings remove controls while preserving plain text', () => {
  const bookmark = normalized({...row, text: 'a\0b\n<c>', tags: [' tag ', 'tag', '\0', 3], summary: 'a\u0007b', note: 'a\tb'});
  assert.equal(bookmark.text, 'ab\n<c>');
  assert.deepEqual(bookmark.tags, ['tag']);
  assert.equal(bookmark.summary, 'ab');
  assert.equal(bookmark.note, 'a\tb');
});

test('untrusted shapes and URL schemes cannot become executable links', () => {
  for (const value of [null, 42, 'javascript:alert(1)', '//example.com', 'http://example.com', 'data:image/svg+xml,x', 'file:///tmp/a', 'https://user:password@example.com']) {
    assert.equal(safeUrl(value), '');
  }
  assert.equal(safeUrl('https://example.com/path?q=1'), 'https://example.com/path?q=1');
  assert.equal(normalized({...row, author: {username: 'bad/name'}}).url, `https://x.com/i/status/${row.id}`);
  assert.equal(normalized({...row, author: {username: '@valid_user'}}).author.username, 'valid_user');
});

test('MCP structured results take precedence and malformed wrappers fail closed', () => {
  assert.equal(normalizeImport({structuredContent: {data: [row]}, content: [{type: 'text', text: 'bad'}]}).bookmarks.length, 1);
  for (const value of [{isError: true, structuredContent: [row]}, {error: 'denied', data: [row]}, {content: []}, {content: [{type: 'text', text: '[]'}, {type: 'text', text: '[]'}]}]) {
    assert.throws(() => normalizeImport(value));
  }
  let deep = [row];
  for (let count = 0; count < 6; count++) deep = {structuredContent: deep};
  assert.throws(() => normalizeImport(deep), /nesting/);
});

test('byte limit counts multibyte UTF-8 input rather than JS characters', () => {
  const payload = JSON.stringify([{...row, text: '界'.repeat(Math.floor(MAX_IMPORT_BYTES / 3))}]);
  assert.ok(payload.length < MAX_IMPORT_BYTES);
  assert.throws(() => normalizeImport(payload), /10 MiB/);
});

test('import text, media and annotation bounds are consistent', () => {
  const bookmark = normalized({...row, text: 'x'.repeat(21000), tags: Array.from({length: 31}, (_, index) => String(index).padEnd(80, 'a')), summary: 's'.repeat(5000), note: 'n'.repeat(11000), media: Array.from({length: 9}, (_, index) => ({url: `https://example.com/${index}.jpg`, alt: 'a'.repeat(600)}))});
  assert.equal(bookmark.text.length, 20000);
  assert.equal(bookmark.tags.length, 30);
  assert.ok(bookmark.tags.every(tag => tag.length === 60));
  assert.equal(bookmark.summary.length, 4000);
  assert.equal(bookmark.note.length, 10000);
  assert.equal(bookmark.media.length, 8);
  assert.equal(bookmark.media[0].alt.length, 500);
});

test('provenance requires a usable sanitized name and a valid timestamp', () => {
  for (const enrichment of [{kind: 'agent', agent: '\0 ', generatedAt: '2026-01-01'}, {kind: 'agent', agent: 'Agent', generatedAt: 'invalid'}, {kind: 'agent', agent: 'Agent'}]) {
    assert.equal(normalized({...row, summary: 'Imported summary', enrichment}).enrichment.kind, 'imported');
  }
  assert.equal(normalized({...row, enrichment: {kind: 'agent', agent: '  Agent  ', generatedAt: '2026-01-01'}}).enrichment.agent, 'Agent');
});

test('sparse source updates preserve source text, date, explicit URL and first save', () => {
  const previous = normalized({...row, createdAt: '2025-01-01', savedAt: '2025-02-01', url: 'https://example.com/original'});
  const incoming = normalized({id: row.id, tags: ['Agent'], summary: 'New enrichment'});
  const merged = mergeBookmarks([previous], [incoming])[0];
  for (const key of ['text', 'createdAt', 'savedAt', 'url', 'author']) assert.deepEqual(merged[key], previous[key]);
  assert.equal(merged.summary, 'New enrichment');
});

test('merge does not mutate either input and cannot silently erase favorites or notes', () => {
  const previous = normalized({...row, note: '', favorite: false});
  const incoming = normalized({...row, text: 'Fresh', note: 'Incoming', favorite: true});
  const snapshot = JSON.stringify([previous, incoming]);
  const merged = mergeBookmarks([previous], [incoming])[0];
  assert.equal(JSON.stringify([previous, incoming]), snapshot);
  assert.equal(merged.note, '');
  assert.equal(merged.favorite, false);
});

test('restoration accepts large v1 libraries but rejects raw snapshots and conflicting versions', () => {
  const bookmarks = Array.from({length: 10001}, (_, index) => ({id: String(index), text: 'Synthetic'}));
  assert.throws(() => normalizeImport({bookmarks}), /10,000/);
  assert.equal(normalizeLibrary({version: 1, bookmarks}).bookmarks.length, 10001);
  assert.equal(normalizeLibrary({schemaVersion: 1, bookmarks: [row]}).bookmarks.length, 1);
  for (const input of [bookmarks, {bookmarks}, {data: [row]}, {version: 2, bookmarks: [row]}, {version: 1, schemaVersion: 2, bookmarks: [row]}]) {
    assert.throws(() => normalizeLibrary(input), /version 1/);
  }
});

test('restoration rejects malformed and duplicate backup rows rather than silently dropping them', () => {
  for (const bookmarks of [[row, row], [row, null], [{id: 1900000000000000001}], [{id: ''}]]) {
    assert.throws(() => normalizeLibrary({version: 1, bookmarks}), /Invalid or duplicate/);
  }
  assert.throws(() => normalizeLibrary({version: 1, bookmarks: Array(MAX_LIBRARY_BOOKMARKS + 1).fill(row)}), /50,000/);
  assert.throws(() => mergeBookmarks(Array.from({length: MAX_LIBRARY_BOOKMARKS}, (_, index) => ({id: String(index)})), [{id: 'overflow'}]), /50,000/);
});

test('shared patch validation matches normalized import and preserves deliberate blank edits', () => {
  const patch = normalizeBookmarkPatch({tags: [' a ', 'a', 'b'.repeat(80)], summary: 'x'.repeat(5000), note: 'a\0b', favorite: false, enrichment: {kind: 'user'}});
  const restored = normalizeLibrary({version: 1, bookmarks: [{...normalized(row), ...patch}]}).bookmarks[0];
  assert.deepEqual(restored.tags, patch.tags);
  assert.equal(restored.summary, patch.summary);
  assert.equal(restored.note, 'ab');
  assert.deepEqual(normalizeBookmarkPatch({tags: [], summary: ''}).enrichment, {kind: 'user'});
  assert.deepEqual(normalizeBookmarkPatch({favorite: true}), {favorite: true});
});

test('shared patch rejects malformed fields and cannot fabricate agent provenance', () => {
  for (const patch of [null, [], 'text', {tags: 'one'}, {tags: [1]}, {summary: null}, {note: 1}, {favorite: 1}, {id: 'replacement'}, {enrichment: {kind: 'agent', agent: 'Fake'}}]) {
    assert.throws(() => normalizeBookmarkPatch(patch));
  }
  assert.deepEqual(normalizeBookmarkPatch({}), {});
  assert.throws(() => normalizeBookmarkPatch(JSON.parse('{"__proto__":{"polluted":true}}')), /Unsupported/);
  assert.equal({}.polluted, undefined);
});
