import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {temporary, root} from './helpers.mjs';
import {validateResource, resourceId, digest} from '../.build/memory/model.js';
import {readMemory} from '../.build/memory/store.js';
import {putResources, deleteResource, syncResources, search, status} from '../.build/memory/service.js';
import {loadProvider} from '../.build/memory/provider.js';

const fixture = (changes = {}) => ({
  source: {provider: 'web', id: 'fictional-accessibility-guide', url: 'https://example.com/accessibility'},
  title: 'Accessible React dialogs', text: 'A fictional guide to focus management and keyboard navigation.',
  summary: 'Keyboard and focus checklist for React dialogs.', purpose: 'Build accessible dialog components',
  useWhen: ['React dialog accessibility audit', '检查对话框键盘导航'], limitations: ['Not a replacement for usability testing'],
  savedReason: null, updatedAt: '2026-10-01T12:00:00.000Z', ...changes,
});
const cli = (args, input) => spawnSync(process.execPath, [join(root, 'scripts/memory.mjs'), ...args], {cwd: root, encoding: 'utf8', input});
async function setup(t) {
  const dir = await temporary(t, 'xstash-memory-');
  return {dir, store: join(dir, 'local.json')};
}
async function fileProvider(dir, store) {
  const config = join(dir, 'provider.json');
  const target = join(dir, 'target.json');
  await writeFile(config, JSON.stringify({kind: 'file', scope: 'personal', path: target}));
  return {provider: await loadProvider(config, store), target, config};
}

test('stable source ID deduplicates, revisions update, stale/conflicting writes preserve data', async (t) => {
  const {store} = await setup(t);
  const first = await putResources(store, [fixture()]);
  assert.equal(first.added, 1);
  assert.equal((await putResources(store, [fixture()])).unchanged, 1);
  const edited = fixture({purpose: 'Audit React dialog focus', updatedAt: '2026-10-02T00:00:00Z'});
  assert.equal((await putResources(store, [edited])).updated, 1);
  const before = await readFile(store, 'utf8');
  await assert.rejects(putResources(store, [fixture()]), /Stale/);
  await assert.rejects(putResources(store, [fixture({...edited, purpose: 'conflict'})]), /Conflicting/);
  await assert.rejects(putResources(store, [edited, edited]), /Duplicate/);
  assert.equal(await readFile(store, 'utf8'), before);
  assert.equal((await readMemory(store)).resources[0].savedReason, null);
  assert.equal((await stat(store)).mode & 0o777, 0o600);
});

test('local task retrieval ranks applicable resources, returns original citations and excludes unrelated queries', async (t) => {
  const {store} = await setup(t);
  await putResources(store, [fixture(), fixture({source: {provider: 'web', id: 'bread', url: 'https://example.com/bread'}, title: 'Sourdough bread', text: 'A fictional recipe.', summary: 'Fermenting dough', purpose: 'Bake bread', useWhen: ['Bread baking']})]);
  const result = await search(store, 'help me audit React dialog accessibility', 5);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].citation.url, 'https://example.com/accessibility');
  assert.equal(result.results[0].citation.id, resourceId('web', 'fictional-accessibility-guide'));
  assert.equal(result.results[0].resource.limitations.length, 1);
  assert.equal((await search(store, '检查对话框键盘导航', 5)).results.length, 1);
  assert.equal((await search(store, 'quantum geology', 5)).results.length, 0);
  assert.equal((await search(store, 'the and for', 5)).results.length, 0);
});

test('explicit personal file provider performs idempotent writes, updates, search and deletions', async (t) => {
  const {dir, store} = await setup(t);
  const {provider, target} = await fileProvider(dir, store);
  await putResources(store, [fixture()]);
  assert.equal((await status(store)).remoteSync, 'not_configured');
  assert.equal((await status(store, provider)).pending, 1);
  assert.equal((await syncResources(store, provider, 'all')).confirmed, 1);
  assert.equal((await syncResources(store, provider, 'all')).unchanged, 1);
  assert.equal((await readMemory(target)).resources.length, 1);
  await putResources(store, [fixture({purpose: 'Updated dialog guidance', updatedAt: '2026-10-03T00:00:00Z'})]);
  assert.equal((await syncResources(store, provider, 'all')).confirmed, 1);
  assert.equal((await readMemory(target)).resources[0].purpose, 'Updated dialog guidance');
  const emptyLocal = join(dir, 'another-local.json');
  assert.equal((await search(emptyLocal, 'React dialog', 5, provider)).results.length, 1);
  const id = resourceId('web', 'fictional-accessibility-guide');
  await deleteResource(store, id);
  assert.equal((await search(store, 'React dialog', 5, provider)).results.length, 0, 'local deletion hides remote stale copy');
  assert.equal((await syncResources(store, provider, id)).confirmed, 1);
  assert.equal((await readMemory(target)).resources.length, 0);
  assert.equal((await status(store, provider)).pending, 0);
  await assert.rejects(putResources(store, [fixture()]), /Stale/);
});

test('partial provider failures stay pending, preserve successful receipts and retry safely', async (t) => {
  const {store} = await setup(t);
  const second = fixture({source: {provider: 'web', id: 'second', url: 'https://example.com/second'}});
  await putResources(store, [fixture(), second]);
  let calls = 0;
  let failing = true;
  const provider = {key: digest('mock-personal'), kind: 'command', async upsert(r) { calls++; if (r.source.id === 'second' && failing) throw new Error('Fixture unavailable'); }, async delete() {}, async search() {return [];} };
  const result = await syncResources(store, provider, 'all');
  assert.equal(result.confirmed, 1);
  assert.equal(result.failures.length, 1);
  assert.equal((await status(store, provider)).pending, 1);
  failing = false;
  assert.equal((await syncResources(store, provider, 'all')).confirmed, 1);
  assert.equal(calls, 3);
});

test('command adapter uses JSON stdin without shell execution and validates mutation acknowledgements', async (t) => {
  const {dir, store} = await setup(t);
  const script = join(dir, 'adapter.mjs');
  const config = join(dir, 'config.json');
  const log = join(dir, 'request.json');
  await writeFile(script, `import {writeFileSync} from 'node:fs'; let raw=''; for await (const c of process.stdin) raw+=c; const r=JSON.parse(raw); writeFileSync(${JSON.stringify(log)},raw); console.log(JSON.stringify({protocol:r.protocol,ok:true,id:r.id,revision:r.revision}));`);
  await writeFile(config, JSON.stringify({kind: 'command', scope: 'personal', namespace: 'fixture', command: [process.execPath, script]}));
  const provider = await loadProvider(config, store);
  await putResources(store, [fixture({text: '$(touch NOT_ALLOWED); `rm -rf anything` — inert source text'})]);
  assert.equal((await syncResources(store, provider, 'all')).confirmed, 1);
  const request = JSON.parse(await readFile(log, 'utf8'));
  assert.equal(request.operation, 'upsert');
  assert.match(request.resource.text, /touch NOT_ALLOWED/);
  assert.equal(request.namespace, 'fixture');
  await writeFile(script, `console.log(JSON.stringify({protocol:'xstash.memory.v1',ok:true,id:'wrong',revision:'wrong'})); process.stdin.resume();`);
  await putResources(store, [fixture({updatedAt: '2026-10-04T00:00:00Z'})]);
  const failed = await syncResources(store, provider, 'all');
  assert.equal(failed.confirmed, 0);
  assert.equal(failed.failures.length, 1);
  assert.equal((await status(store, provider)).pending, 1);
});

test('invalid data and provider configuration fail without overwriting or selecting a remote', async (t) => {
  const {dir, store} = await setup(t);
  await writeFile(store, '{broken');
  await assert.rejects(putResources(store, [fixture()]));
  assert.equal(await readFile(store, 'utf8'), '{broken');
  assert.throws(() => validateResource(fixture({source: {provider: 'web', id: 'x', url: 'https://secret:token@example.com'}})), /credentials/);
  const config = join(dir, 'bad-config.json');
  await writeFile(config, JSON.stringify({kind: 'file', path: store, scope: 'organization'}));
  await assert.rejects(loadProvider(config, store), /personal/);
  await writeFile(config, JSON.stringify({kind: 'file', path: store, scope: 'personal'}));
  await assert.rejects(loadProvider(config, store), /differ/);
  const result = cli(['sync', '--all', '--store', join(dir, 'empty.json')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not configured/);
});

test('CLI capture preserves gallery bytes and distillation, is repeatable and never resurrects deletions', async (t) => {
  const {dir, store} = await setup(t);
  const bookmarks = join(dir, 'gallery.json');
  const original = JSON.stringify({version: 1, bookmarks: [{id: 'fictional-1', text: 'Fictional React dialog guide', url: 'https://example.com/source', summary: 'Existing source summary'}]});
  await writeFile(bookmarks, original);
  const args = ['capture', '--bookmarks', bookmarks, '--store', store];
  assert.equal(cli(args).status, 0);
  assert.equal(JSON.parse(cli(args).stdout).unchanged, 1);
  let resource = (await readMemory(store)).resources[0];
  resource = {...resource, purpose: 'User-approved use case', savedReason: null, updatedAt: new Date(Date.parse(resource.updatedAt) + 1000).toISOString()};
  assert.equal(cli(['put', '-', '--store', store], JSON.stringify(resource)).status, 0);
  assert.equal(cli(args).status, 0);
  assert.equal((await readMemory(store)).resources[0].purpose, 'User-approved use case');
  assert.equal(cli(['delete', resource.id, '--store', store]).status, 0);
  assert.equal(JSON.parse(cli(args).stdout).skippedDeleted, 1);
  assert.equal((await readMemory(store)).resources.length, 0);
  assert.equal(await readFile(bookmarks, 'utf8'), original);
  assert.equal(JSON.parse(cli(['status', '--store', store]).stdout).remoteSync, 'not_configured');
});

test('capture flags changed source text for review without overwriting distillation', async (t) => {
  const {dir, store} = await setup(t);
  const bookmarks = join(dir, 'gallery.json');
  const record = {id: 'fictional-change', text: 'Original guide', url: 'https://example.com/source', summary: 'Original summary'};
  const write = async () => writeFile(bookmarks, JSON.stringify({version: 1, bookmarks: [record]}));
  await write();
  const args = ['capture', '--bookmarks', bookmarks, '--store', store];
  assert.equal(cli(args).status, 0);
  record.text = 'Updated guide with a changed API';
  await write();
  assert.equal(JSON.parse(cli(args).stdout).updated, 1);
  const resource = (await readMemory(store)).resources[0];
  assert.equal(resource.text, record.text);
  assert.equal(resource.summary, 'Original summary');
  assert.match(resource.limitations.join(' '), /review previous distillation/);
  assert.equal(JSON.parse(cli(['get', resource.id, '--store', store]).stdout).id, resource.id);
  assert.equal(cli(['get', 'absent', '--store', store]).status, 1);
});

test('command provider round-trips private-namespace upsert, search and delete with a local mock', async (t) => {
  const {dir, store} = await setup(t);
  const script = join(dir, 'roundtrip-adapter.mjs');
  const config = join(dir, 'config.json');
  const target = join(dir, 'mock-memory.json');
  await writeFile(script, `
import {readFileSync,writeFileSync} from 'node:fs';
let raw=''; process.stdin.setEncoding('utf8'); for await (const c of process.stdin) raw+=c;
const r=JSON.parse(raw); const path=${JSON.stringify(target)};
let data={}; try {data=JSON.parse(readFileSync(path,'utf8'));} catch(e) {if(e.code!=='ENOENT')throw e;}
const key=r.namespace+':'+r.id;
if(r.operation==='upsert')data[key]=r.resource;
else if(r.operation==='delete')delete data[key];
else if(r.operation!=='search')throw new Error('Unknown operation');
writeFileSync(path,JSON.stringify(data),{mode:0o600});
console.log(JSON.stringify(r.operation==='search'?{protocol:r.protocol,ok:true,resources:Object.entries(data).filter(([k])=>k.startsWith(r.namespace+':')).map(([,v])=>v)}:{protocol:r.protocol,ok:true,id:r.id,revision:r.revision}));`);
  await writeFile(config, JSON.stringify({kind: 'command', scope: 'personal', namespace: 'fixture', command: [process.execPath, script]}));
  const provider = await loadProvider(config, store);
  await putResources(store, [fixture()]);
  assert.equal((await syncResources(store, provider, 'all')).confirmed, 1);
  const emptyStore = join(dir, 'empty-local.json');
  assert.equal((await search(emptyStore, 'React accessibility', 5, provider)).results.length, 1);
  assert.equal((await search(emptyStore, 'unrelated geology', 5, provider)).results.length, 0);
  await deleteResource(store, resourceId('web', 'fictional-accessibility-guide'));
  assert.equal((await syncResources(store, provider, 'all')).confirmed, 1);
  assert.equal((await search(emptyStore, 'React accessibility', 5, provider)).results.length, 0);
});
