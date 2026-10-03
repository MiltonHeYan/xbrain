import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {startServer} from './helpers.mjs';

const fixture = {id: 'qa1', text: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)', author: {name: 'QA'}, tags: ['test']};

test('local API persists, merges and exports while retaining local edits', async t => {
  const {store, request} = await startServer(t);
  assert.equal((await request('/api/bookmarks', undefined, 'GET')).data.bookmarks.length, 0);
  assert.equal((await request('/api/import', [fixture])).status, 200);
  assert.equal((await request('/api/bookmarks/qa1', {tags: ['mine'], summary: 'My summary', favorite: true}, 'PUT')).status, 200);
  await request('/api/import', [{...fixture, text: 'new', tags: ['replacement']}]);
  const library = (await request('/api/bookmarks', undefined, 'GET')).data.bookmarks;
  assert.equal(library.length, 1);
  assert.deepEqual(library[0].tags, ['mine']);
  assert.equal(library[0].text, 'new');
  assert.equal(library[0].favorite, true);
  assert.equal(library[0].url, '');
  assert.deepEqual(JSON.parse(await readFile(store, 'utf8')).bookmarks, library);
  assert.deepEqual((await request('/api/export', undefined, 'GET')).data.bookmarks, library);
});

test('local API rejects cross-site requests, rebound hosts and malformed origins', async t => {
  const {base, request} = await startServer(t);
  for (const Origin of ['https://evil.example', 'null', 'not-a-url', base + '/path', base.replace('http:', 'https:'), base.replace('http://', 'http://user@')]) {
    assert.equal((await request('/api/import', [fixture], 'POST', {Origin})).status, 403, Origin);
  }
  assert.equal((await request('/api/import', [fixture], 'POST', {'Sec-Fetch-Site': 'cross-site'})).status, 403);
  const reboundStatus = await new Promise((resolve, reject) => {
    const req = http.get(base + '/api/bookmarks', {headers: {Host: 'attacker.example'}}, response => {
      response.resume();
      resolve(response.statusCode);
    });
    req.on('error', reject);
  });
  assert.equal(reboundStatus, 403);
  assert.equal((await request('/api/import', [fixture], 'POST', {Origin: base})).status, 200);
  assert.equal((await request('/api/bookmarks', undefined, 'GET')).headers.get('access-control-allow-origin'), null);
});

test('invalid API imports never create or alter records', async t => {
  const {base, request} = await startServer(t);
  await request('/api/import', [fixture]);
  const before = (await request('/api/bookmarks', undefined, 'GET')).data;
  for (const input of [[], {}, null, [null], [{id: 1900000000000000001}], {isError: true, content: []}]) {
    assert.equal((await request('/api/import', input)).status, 400);
  }
  assert.equal((await fetch(base + '/api/import', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: 'bad'})).status, 400);
  for (const contentType of ['text/plain', 'application/json-malformed']) {
    assert.equal((await fetch(base + '/api/import', {method: 'POST', headers: {'Content-Type': contentType}, body: '[]'})).status, 415);
  }
  assert.equal((await fetch(base + '/api/import', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: ' '.repeat(10 * 1024 * 1024 + 1)})).status, 413);
  assert.deepEqual((await request('/api/bookmarks', undefined, 'GET')).data, before);
});

test('invalid and unsupported edit fields leave the full persisted bookmark unchanged', async t => {
  const {store, request} = await startServer(t);
  await request('/api/import', [fixture]);
  const original = await readFile(store, 'utf8');
  for (const patch of [[], null, {favorite: 'yes'}, {tags: [3]}, {summary: null}, {note: 3}, {id: 'changed'}, {text: 'replaced'}, {enrichment: {kind: 'agent', agent: 'Fake'}}]) {
    assert.equal((await request('/api/bookmarks/qa1', patch, 'PUT')).status, 400);
    assert.equal(await readFile(store, 'utf8'), original);
  }
  assert.equal((await request('/api/bookmarks/missing', {favorite: true}, 'PUT')).status, 404);
  const edited = await request('/api/bookmarks/qa1', {tags: [' tag ', 'tag'], summary: 'x'.repeat(5000), note: 'a\0b', enrichment: {kind: 'user'}}, 'PUT');
  assert.equal(edited.status, 200);
  assert.equal(edited.data.bookmark.summary.length, 4000);
  assert.equal(edited.data.bookmark.note, 'ab');
  assert.deepEqual(edited.data.bookmark.tags, ['tag']);
  assert.equal(edited.data.bookmark.enrichment.kind, 'user');
});

test('API concurrent imports and edits preserve all successful operations', async t => {
  const {request} = await startServer(t);
  const imports = await Promise.all(Array.from({length: 12}, (_, index) => request('/api/import', [{...fixture, id: `concurrent-${index}`}])));
  assert.ok(imports.every(result => result.status === 200));
  const edits = await Promise.all(Array.from({length: 12}, (_, index) => request(`/api/bookmarks/concurrent-${index}`, {favorite: true, note: String(index)}, 'PUT')));
  assert.ok(edits.every(result => result.status === 200));
  const library = (await request('/api/bookmarks', undefined, 'GET')).data.bookmarks;
  assert.equal(library.length, 12);
  assert.ok(library.every(bookmark => bookmark.favorite && bookmark.note === bookmark.id.split('-')[1]));
});

test('static routes have security headers and cannot expose project or datastore files', async t => {
  const {base} = await startServer(t);
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal((await fetch(base, {method: 'HEAD'})).status, 200);
  assert.equal(await (await fetch(base, {method: 'HEAD'})).text(), '');
  assert.match((await fetch(base + '/lib/bookmarks.mjs')).headers.get('content-type'), /javascript/);
  for (const name of ['/data/bookmarks.json', '/package.json', '/server.mjs', '/lib/store.mjs']) assert.equal((await fetch(base + name)).status, 404);
  assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 403);
  assert.equal((await fetch(base + '/%zz')).status, 400);
  assert.equal((await fetch(base, {method: 'POST'})).status, 405);
});

test('corrupt stores remain untouched when API reads or writes fail', async t => {
  const {store, request} = await startServer(t);
  const corrupt = '{"version":1,"bookmarks":[null]}';
  await writeFile(store, corrupt);
  assert.equal((await request('/api/bookmarks', undefined, 'GET')).status, 400);
  assert.equal((await request('/api/import', [fixture])).status, 400);
  assert.equal(await readFile(store, 'utf8'), corrupt);
});
