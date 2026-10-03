import test from 'node:test';
import assert from 'node:assert/strict';
import {filterBookmarks} from '../.build/client/selectors.js';
import {normalizeImport, normalizeLibrary} from '../lib/bookmarks.mjs';

const search = (bookmarks, query) => filterBookmarks(bookmarks, 'all', '', query, 'newest');

test('search does not match generated missing-author text in newly imported records', () => {
  const {bookmarks} = normalizeImport([
    {id: 'missing-author', text: 'A fictional saved post'},
    {id: 'empty-author', text: 'Another fictional post', author: {}},
  ]);
  assert.equal(bookmarks[0].sourceFields.author, false);
  assert.equal(bookmarks[1].sourceFields.author, true);
  for (const query of ['unknown', 'author', 'UNKNOWN AUTHOR', 'unkn']) {
    assert.deepEqual(search(bookmarks, query), []);
  }
  assert.equal(search(bookmarks, '').length, 2);
  assert.equal(search(bookmarks, 'fictional').length, 2);
});

test('search excludes missing-author fallback in legacy libraries after normalization', () => {
  const legacy = normalizeImport([{id: 'legacy-missing', text: 'A fictional legacy post'}]).bookmarks;
  delete legacy[0].sourceFields;
  assert.deepEqual(search(legacy, 'unknown'), []);
  const restored = normalizeLibrary({version: 1, bookmarks: legacy}).bookmarks;
  // Old fallback objects look like supplied authors when a v1 backup is read again.
  assert.equal(restored[0].sourceFields.author, true);
  const before = JSON.stringify(restored);
  assert.deepEqual(search(restored, 'unknown author'), []);
  assert.equal(JSON.stringify(restored), before);
});

test('search preserves genuine unknown-author words in post text and annotations', () => {
  const {bookmarks} = normalizeImport([
    {id: 'source-match', text: 'An unknown author wrote this fictional post'},
    {id: 'summary-match', summary: 'An unknown author shared an idea'},
    {id: 'note-match', note: 'Ask the unknown author about this'},
    {id: 'tag-match', tags: ['Unknown author']},
  ]);
  for (const query of ['unknown', 'author', 'UNKNOWN AUTHOR']) {
    assert.deepEqual(new Set(search(bookmarks, query).map((b) => b.id)), new Set(bookmarks.map((b) => b.id)));
  }
});

test('search retains genuine author names and usernames containing unknown', () => {
  const {bookmarks} = normalizeImport([
    {id: 'named-author', author: {name: 'The Unknown Writer'}},
    {id: 'username-match', author: {name: 'Fictional Writer', username: 'unknown_writer'}},
    {id: 'named-with-handle', author: {name: 'Unknown author', username: 'fictionalwriter'}},
    {id: 'different-name', author: {name: 'Unknown Author'}},
  ]);
  assert.equal(search(bookmarks, 'unknown').length, 4);
  assert.deepEqual(search(bookmarks, 'unknown fictionalwriter').map((b) => b.id), ['named-with-handle']);
});

test('a missing-author fallback cannot satisfy one word of a multiword search', () => {
  const {bookmarks} = normalizeImport([{id: 'unknown-subject', text: 'Exploring unknown places'}]);
  assert.equal(search(bookmarks, 'unknown').length, 1);
  assert.deepEqual(search(bookmarks, 'unknown author'), []);
});
