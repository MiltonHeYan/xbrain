import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {temporary, root} from './helpers.mjs';
import {readMemory} from '../.build/memory/store.js';
import {resourceId, digest} from '../.build/memory/model.js';
import {pullResources, pendingDistillation, distillResources} from '../.build/memory/pull.js';
import {loadSource} from '../.build/memory/source.js';
import {loadProvider} from '../.build/memory/provider.js';
import {deleteResource, putResources, search} from '../.build/memory/service.js';

const item = (id, text = `Fictional React dialog guide ${id}`, updatedAt = '2026-10-01T00:00:00Z') => ({id, title: `Fictional guide ${id}`, text, url: `https://example.com/${id}`, updatedAt});
const cli = (args, input) => spawnSync(process.execPath, [join(root, 'scripts/memory.mjs'), ...args], {cwd: root, encoding: 'utf8', input});
const jsonCli = (args, input) => { const result = cli(args, input); assert.equal(result.status, 0, result.stderr || result.stdout); return JSON.parse(result.stdout); };
async function setup(t, pagination = 'cursor', incremental = 'checkpoint') {
  const dir = await temporary(t, 'xstash-pull-');
  const store = join(dir, 'memory.json');
  const script = join(dir, 'source.mjs');
  const config = join(dir, 'source.json');
  const scenario = join(dir, 'pages.json');
  const requests = join(dir, 'requests.jsonl');
  await writeFile(script, `import {readFileSync,appendFileSync} from 'node:fs'; let raw='';process.stdin.setEncoding('utf8');for await(const c of process.stdin)raw+=c;const r=JSON.parse(raw);appendFileSync(${JSON.stringify(requests)},JSON.stringify(r)+'\\n');const pages=JSON.parse(readFileSync(${JSON.stringify(scenario)},'utf8'));const p=pages[r.cursor??'start'];if(!p)process.exit(2);console.log(JSON.stringify({protocol:r.protocol,provider:r.provider,account:r.account,...p}));`);
  await writeFile(config, JSON.stringify({kind: 'command', scope: 'personal', provider: 'x', account: 'fictional-account', pagination, incremental, command: [process.execPath, script]}));
  return {dir, store, config, requests, set: (data) => writeFile(scenario, JSON.stringify(data)), source: await loadSource(config)};
}
const page = (items, nextCursor = null, checkpoint = 'v1', coverage = 'full') => ({ok: true, items, nextCursor, checkpoint, coverage});
async function refine(store) {
  const pending = jsonCli(['pending', '--store', store]);
  const entries = pending.items.map(({id, sourceRevision, resourceRevision}) => ({id, sourceRevision, resourceRevision, summary: 'Fictional keyboard reference', purpose: 'Audit React dialog accessibility', useWhen: ['React dialog accessibility'], limitations: ['Fictional; not independently validated'], savedReason: 'must never be invented'}));
  return jsonCli(['distill', '-', '--store', store], JSON.stringify(entries));
}

test('manual CLI workflow pulls pages, deduplicates, distills, updates selected file memory and retrieves original sources', async (t) => {
  const s = await setup(t);
  await s.set({start: page([item('a')], 'page2', null), page2: page([item('a'), item('b')])});
  const args = ['pull', '--source-config', s.config, '--store', s.store];
  const first = jsonCli(args);
  assert.equal(first.added, 2); assert.equal(first.unchanged, 1); assert.equal(first.state, 'complete');
  assert.equal((await readMemory(s.store)).ingestion.sources[s.source.key].checkpoint, 'v1');
  const providerPath = join(s.dir, 'provider.json'), target = join(s.dir, 'target.json');
  await writeFile(providerPath, JSON.stringify({kind: 'file', scope: 'personal', path: target}));
  const blocked = cli(['sync', '--all', '--provider-config', providerPath, '--store', s.store]);
  assert.equal(blocked.status, 1); assert.equal(JSON.parse(blocked.stdout).skippedPending, 2);
  assert.equal((await readMemory(target)).resources.length, 0);
  assert.equal((await refine(s.store)).distilled, 2);
  const synced = jsonCli(['sync', '--all', '--provider-config', providerPath, '--store', s.store]);
  assert.equal(synced.confirmed, 2);
  assert.equal((await readMemory(target)).resources[0].savedReason, null);
  const provider = await loadProvider(providerPath, s.store);
  assert.equal((await search(join(s.dir, 'another-agent.json'), 'React dialog accessibility', 5, provider)).results[0].citation.url.startsWith('https://example.com/'), true);
  const bytes = await readFile(target, 'utf8');
  assert.equal(jsonCli(args).added, 0);
  assert.equal(jsonCli(['pending', '--store', s.store]).pending, 0);
  assert.equal(jsonCli(['sync', '--all', '--provider-config', providerPath, '--store', s.store]).unchanged, 2);
  assert.equal(await readFile(target, 'utf8'), bytes);
  const requests = (await readFile(s.requests, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(requests[2].checkpoint, 'v1');
  // Delta contains only a changed item and a new item; b must not be deleted.
  await s.set({start: page([{...item('a', 'Changed React dialog source', '2026-10-02T00:00:00Z'), title: 'Changed source title'}, item('c')], null, 'v2')});
  const delta = jsonCli(args); assert.equal(delta.updated, 1); assert.equal(delta.added, 1);
  assert.equal((await readMemory(s.store)).resources.length, 3);
  await refine(s.store);
  assert.equal(jsonCli(['sync', '--all', '--provider-config', providerPath, '--store', s.store]).confirmed, 2);
  assert.equal((await readMemory(target)).resources.length, 3);
  assert.equal((await readMemory(target)).resources.find((r) => r.source.id === 'a').text, 'Changed React dialog source');
  assert.equal((await readMemory(target)).resources.find((r) => r.source.id === 'a').title, 'Changed source title');
});

test('failed later page leaves checkpoint unchanged and resumes the committed cursor', async (t) => {
  const s = await setup(t);
  await s.set({start: page([item('a')], 'next', 'must-not-commit'), next: {ok: false, code: 'rate_limited'}});
  const args = ['pull', '--source-config', s.config, '--store', s.store];
  const fail = cli(args); assert.equal(fail.status, 1);
  assert.match(JSON.parse(fail.stdout).error, /rate_limited/);
  let data = await readMemory(s.store);
  assert.equal(data.resources.length, 1); assert.equal(data.ingestion.sources[s.source.key].cursor, 'next');
  assert.equal(data.ingestion.sources[s.source.key].checkpoint, null);
  await s.set({next: page([item('a'), item('b')], null, 'success')});
  const resumed = jsonCli(args); assert.equal(resumed.added, 1); assert.equal(resumed.pages, 1);
  data = await readMemory(s.store); assert.equal(data.resources.length, 2);
  assert.equal(data.ingestion.sources[s.source.key].checkpoint, 'success');
});

test('page budget pause and expired cursor preserve data; explicit restart safely rescans', async (t) => {
  const s = await setup(t);
  await s.set({start: page([item('a')], 'next', null), next: page([item('b')])});
  assert.equal((await pullResources(s.store, s.source, 1)).state, 'paused');
  assert.equal((await readMemory(s.store)).ingestion.sources[s.source.key].active, true);
  await s.set({next: {ok: false, code: 'cursor_expired'}});
  assert.match((await pullResources(s.store, s.source)).error, /cursor_expired/);
  await s.set({start: page([item('a'), item('b')])});
  const restarted = await pullResources(s.store, s.source, 10, true);
  assert.equal(restarted.state, 'complete'); assert.equal(restarted.added, 1);
  assert.equal((await readMemory(s.store)).resources.length, 2);
});

test('invalid page is atomic; repeated cursor, account mismatch and unsupported pagination fail closed', async (t) => {
  const s = await setup(t);
  await s.set({start: page([item('a'), {...item('bad'), url: 'javascript:alert(1)'}])});
  assert.equal((await pullResources(s.store, s.source)).state, 'failed');
  assert.equal((await readMemory(s.store)).resources.length, 0);
  await s.set({start: page([item('a')], 'next', null), next: page([item('b')], 'next', null)});
  assert.match((await pullResources(s.store, s.source)).error, /Repeated/);
  assert.equal((await readMemory(s.store)).resources.length, 1);
  await s.set({next: {...page([item('b')]), account: 'wrong'}});
  assert.match((await pullResources(s.store, s.source)).error, /mismatch/);
  const single = await setup(t, 'single', 'rescan');
  await single.set({start: page([item('a')], 'unsupported', null, 'partial')});
  assert.match((await pullResources(single.store, single.source)).error, /pagination/);
  await single.set({start: page([item('a')], null, null, 'partial')});
  const result = await pullResources(single.store, single.source);
  assert.equal(result.coverage, 'partial'); assert.equal(result.state, 'complete');
  assert.equal((await pullResources(single.store, single.source)).unchanged, 1);
});

test('stale versions, local deletions and stale Agent refinements never overwrite newer state', async (t) => {
  const s = await setup(t);
  await s.set({start: page([item('a')])});
  await pullResources(s.store, s.source);
  const stale = (await pendingDistillation(s.store)).items[0];
  const refinement = {...stale, summary: 'summary', purpose: 'purpose', useWhen: [], limitations: []};
  const local = stale.resource;
  await putResources(s.store, [{...local, purpose: 'User edit', updatedAt: new Date(Date.parse(local.updatedAt) + 1).toISOString()}]);
  await assert.rejects(distillResources(s.store, refinement), /Stale/);
  await s.set({start: page([item('a', 'New source', '2026-10-02T00:00:00Z')], null, 'v2')});
  await pullResources(s.store, s.source);
  await assert.rejects(distillResources(s.store, refinement), /Stale/);
  assert.equal((await readMemory(s.store)).resources[0].purpose, 'User edit');
  await s.set({start: page([item('a')], null, 'v3')});
  assert.equal((await pullResources(s.store, s.source)).skippedOlder, 1);
  assert.equal((await readMemory(s.store)).resources[0].text, 'New source');
  await deleteResource(s.store, resourceId('x', 'a'));
  assert.equal((await pullResources(s.store, s.source)).skippedDeleted, 1);
  assert.equal((await pendingDistillation(s.store)).pending, 0);
});

test('interrupted fetch before commit replays safely, and concurrent progress rejects stale page', async (t) => {
  const s = await setup(t);
  await s.set({start: page([item('a')], 'next', null), next: page([item('b')])});
  await pullResources(s.store, s.source, 1);
  const before = await readFile(s.store, 'utf8');
  const interrupted = {...s.source, async fetch() {throw new Error('Simulated Agent interruption before page commit');}};
  assert.equal((await pullResources(s.store, interrupted)).state, 'failed');
  assert.equal(await readFile(s.store, 'utf8'), before);
  assert.equal((await pullResources(s.store, s.source)).added, 1);
  let release, entered;
  const waiting = new Promise((resolve) => {entered = resolve;});
  const gate = new Promise((resolve) => {release = resolve;});
  const delayed = {...s.source, async fetch() {entered(); await gate; return {items: [item('c')], nextCursor: null, checkpoint: 'old', coverage: 'full'};}};
  const stale = pullResources(s.store, delayed);
  await waiting;
  await s.set({start: page([item('d')], null, 'v1')});
  await pullResources(s.store, s.source);
  release();
  assert.match((await stale).error, /Another pull/);
  assert.equal((await readMemory(s.store)).resources.some((r) => r.source.id === 'c'), false);
});
