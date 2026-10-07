import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {temporary, startServer, root} from './helpers.mjs';
import {putResources, syncResources} from '../.build/memory/service.js';
import {readMemory} from '../.build/memory/store.js';
import {pullResources} from '../.build/memory/pull.js';
import {loadProvider} from '../.build/memory/provider.js';
import {digest, validateResource} from '../.build/memory/model.js';
import {normalizeImport} from '../.build/shared/bookmarks.js';
import {snapshotPage} from '../.build/adapters/corespeed-source.js';
const example = JSON.parse(await readFile(join(root, 'examples/design-resources.json'), 'utf8'))[0];
const fixture = (id = '149') =>
  validateResource({
    ...example,
    id: undefined,
    source: {provider: 'x', id, url: `https://x.com/i/web/status/${id}`},
    title: `Fictional ${id}`,
    text: `Fictional text ${id}`,
  });
const source = (r, text = r.text) => ({
  key: digest('fictional-source'),
  provider: 'x',
  pagination: 'single',
  incremental: 'rescan',
  fetch: async () => ({
    items: [{id: r.source.id, url: r.source.url, title: r.title, text, updatedAt: null}],
    nextCursor: null,
    checkpoint: null,
    coverage: 'partial',
  }),
});
test('put → first pull preserves analysis, custom title and sync eligibility; changed content still invalidates', async (t) => {
  const dir = await temporary(t),
    store = join(dir, 'memory.json');
  const r = fixture();
  await putResources(store, [{...r, title: 'User title'}]);
  const before = (await readMemory(store)).resources;
  const first = await pullResources(store, source(r));
  assert.equal(first.unchanged, 1);
  assert.equal(first.updated, 0);
  let data = await readMemory(store);
  assert.deepEqual(data.resources, before);
  assert.equal(Object.keys(data.ingestion.pending).length, 0);
  assert.ok(data.ingestion.captures[r.id]);
  assert.equal((await pullResources(store, source(r))).unchanged, 1);
  const config = join(dir, 'provider.json');
  await writeFile(
    config,
    JSON.stringify({kind: 'file', scope: 'personal', path: join(dir, 'remote.json')}),
  );
  assert.equal((await syncResources(store, await loadProvider(config, store), 'all')).confirmed, 1);
  await pullResources(store, source(r, 'Actually changed'));
  data = await readMemory(store);
  assert.equal(data.resources[0].design.status, 'stale');
  assert.equal(Object.keys(data.ingestion.pending).length, 1);
});
test('import → capture → analyze → CoreSpeed pull uses one X URL and preserves evidence', async (t) => {
  const dir = await temporary(t),
    store = join(dir, 'memory.json'),
    library = join(dir, 'gallery.json');
  const text = 'Fictional reference';
  const id = '123456789';
  const imported = normalizeImport({
    data: [{id, text, author_id: 'a'}],
    includes: {users: [{id: 'a', username: 'fictional'}]},
  }).bookmarks;
  const snap = {
    format: 'xstash.corespeed-snapshot.v1',
    fetchedAt: new Date().toISOString(),
    account: '@fictional',
    accounts: [
      {connector: 'twitter', alias: '@fictional', identity: '@fictional', member_scope: true},
    ],
    result: {structuredContent: {data: [{id, text}]}},
  };
  const page = snapshotPage(snap, {account: '@fictional'}, 100);
  assert.equal(imported[0].url, page.items[0].url);
  await writeFile(library, JSON.stringify({version: 1, bookmarks: imported}));
  const run = (args, input) => {
    const p = spawnSync(
      process.execPath,
      [join(root, 'scripts/memory.mjs'), ...args, '--store', store],
      {encoding: 'utf8', input},
    );
    assert.equal(p.status, 0, p.stdout + p.stderr);
    return JSON.parse(p.stdout);
  };
  run(['capture', '--bookmarks', library]);
  let r = (await readMemory(store)).resources[0];
  run(
    ['analyze', '-'],
    JSON.stringify({id: r.id, resourceRevision: digest(r), design: example.design}),
  );
  r = (await readMemory(store)).resources[0];
  const s = {...source(r), fetch: async () => page};
  assert.equal((await pullResources(store, s)).unchanged, 1);
  assert.deepEqual((await readMemory(store)).resources[0], r);
});
test('Gallery pages and searches all 150 records while graph remains bounded and can focus an overflow record', async (t) => {
  const store = join(await temporary(t), 'memory.json');
  const records = Array.from({length: 150}, (_, i) => fixture(String(i + 1000)));
  records[149].text = 'uniqueneedle149';
  await putResources(store, records);
  const server = await startServer(t, {MEMORY_STORE: store});
  const page = await server.request('/api/references', undefined, 'GET');
  assert.equal(page.status, 200);
  assert.equal(page.data.total, 150);
  assert.equal(page.data.resources.length, 100);
  assert.equal(page.data.hasMore, true);
  const next = await server.request('/api/references?offset=100', undefined, 'GET');
  assert.equal(next.data.resources.length, 50);
  assert.equal(next.data.hasMore, false);
  assert.equal(
    new Set([...page.data.resources, ...next.data.resources].map((r) => r.id)).size,
    150,
  );
  const found = await server.request('/api/references?q=uniqueneedle149', undefined, 'GET');
  assert.deepEqual(
    found.data.resources.map((r) => r.id),
    [records[149].id],
  );
  assert.equal(found.data.total, 150);
  assert.equal(found.data.matched, 1);
  const graph = await server.request('/api/design', undefined, 'GET');
  assert.equal(graph.data.resources.length, 100);
  assert.equal(graph.data.truncated, true);
  const focused = await server.request(`/api/design?id=${records[149].id}`, undefined, 'GET');
  assert.ok(focused.data.nodes.some((n) => n.id === records[149].id));
  assert.equal(focused.data.total, 150);
});

test('legacy X URL aliases are equivalent across validation and repeated pulls, unrelated URLs are preserved', async (t) => {
  const store = join(await temporary(t), 'memory.json');
  const r = fixture('123456789');
  await putResources(store, [r]);
  await pullResources(store, source(r));
  for (const url of [
    'https://twitter.com/fictional/status/123456789?s=20',
    'https://x.com/i/status/123456789',
    'https://x.com/fictional/status/123456789/photo/1',
    'https://mobile.twitter.com/fictional/status/123456789',
  ]) {
    assert.equal(validateResource({...r, source: {...r.source, url}}).source.url, r.source.url);
    assert.equal(
      (await pullResources(store, source({...r, source: {...r.source, url}}))).unchanged,
      1,
    );
    assert.equal((await readMemory(store)).resources[0].design.status, 'analyzed');
  }
  const other = 'https://example.com/fictional/status/123456789';
  assert.equal(validateResource({...r, source: {...r.source, url: other}}).source.url, other);
  assert.equal(
    validateResource({...r, source: {...r.source, url: 'https://x.com/fictional/status/999'}})
      .source.url,
    'https://x.com/fictional/status/999',
  );
});

test('an existing legacy capture hash is reconciled without dropping analysis or a pending review', async (t) => {
  const store = join(await temporary(t), 'memory.json');
  const r = fixture('123456789');
  await putResources(store, [r]);
  const s = source(r);
  await pullResources(store, s);
  const legacy = JSON.parse(await readFile(store, 'utf8'));
  const url = 'https://twitter.com/fictional/status/123456789?s=20';
  legacy.resources[0].source.url = url;
  const revision = digest({provider: 'x', id: r.source.id, title: r.title, text: r.text, url});
  legacy.ingestion.captures[r.id].revision = revision;
  legacy.ingestion.pending[r.id] = {sourceKey: s.key, sourceRevision: revision};
  await writeFile(store, JSON.stringify(legacy));
  assert.equal((await pullResources(store, s)).unchanged, 1);
  const after = await readMemory(store);
  assert.deepEqual(after.resources[0].design, r.design);
  assert.equal(Object.keys(after.ingestion.pending).length, 1);
  assert.equal(
    after.ingestion.pending[r.id].sourceRevision,
    after.ingestion.captures[r.id].revision,
  );
});
