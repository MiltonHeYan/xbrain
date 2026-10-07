import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {temporary, startServer, root} from './helpers.mjs';
import {validateDesign} from '../.build/shared/design.js';
import {designGraph} from '../.build/shared/design-graph.js';
import {validateResource, digest} from '../.build/memory/model.js';
import {readMemory} from '../.build/memory/store.js';
import {putResources, search, syncResources} from '../.build/memory/service.js';
import {analyzeResource, capturedDesign} from '../.build/memory/design.js';
import {loadProvider} from '../.build/memory/provider.js';
import {writeFile} from 'node:fs/promises';
const examples = JSON.parse(await readFile(new URL('../examples/design-resources.json', import.meta.url), 'utf8'));
const fixture = () => structuredClone(examples[0]);

test('visual schema rejects text-only guesses, missing evidence, unknown references and unsafe image links', () => {
  const d = fixture().design;
  assert.equal(validateDesign(d).styles[0].confirmation, null);
  for (const mutate of [
    x => x.images[0].observed = false,
    x => x.features[0].evidence = '',
    x => x.domains[0].featureIds = ['absent'],
    x => x.styles[0].featureIds = [],
    x => x.features[0].imageUrl = 'https://example.com/other.png',
    x => x.images[0].url = 'javascript:alert(1)',
    x => x.images[0].url = 'https://secret:token@example.com/a.png',
    x => x.status = 'unanalyzed',
    x => x.analyzedAt = null,
  ]) { const bad = structuredClone(d); mutate(bad); assert.throws(() => validateDesign(bad)); }
  assert.equal(validateDesign(examples[4].design).features.length, 0);
});

test('classification round-trips, revision-guarded analysis preserves source, multi-style evidence and chosen personal provider', async t => {
  const dir = await temporary(t), store = join(dir, 'local.json');
  const input = fixture(); delete input.design;
  await putResources(store, [input]);
  const old = (await readMemory(store)).resources[0];
  const design = fixture().design;
  design.styles.push({label:'Swiss influence', featureIds:['f1'], confidence:'low', confirmation:null});
  await analyzeResource(store, {id:old.id,resourceRevision:digest(old),design});
  const next = (await readMemory(store)).resources[0];
  assert.deepEqual(next.source, old.source); assert.equal(next.text,old.text); assert.equal(next.savedReason,null);
  assert.equal(next.design.styles.length,2);
  await assert.rejects(analyzeResource(store,{id:old.id,resourceRevision:digest(old),design}), /Stale/);
  const before = await readFile(store,'utf8');
  await assert.rejects(analyzeResource(store,{id:next.id,resourceRevision:digest(next),design:{...design,features:[]}}));
  assert.equal(await readFile(store,'utf8'),before);
  const config = join(dir,'provider.json'); await writeFile(config,JSON.stringify({kind:'file',scope:'personal',path:join(dir,'remote.json')}));
  const provider = await loadProvider(config,store);
  assert.equal((await syncResources(store,provider,next.id)).confirmed,1);
  assert.deepEqual((await readMemory(join(dir,'remote.json'))).resources[0].design,next.design);
});

test('task/domain/feature/style retrieval combines filters and preserves original image citations across categories', async t => {
  const store = join(await temporary(t),'memory.json');
  await putResources(store,examples);
  assert.equal((await putResources(store,examples)).unchanged,5);
  assert.equal((await search(store,'generous whitespace',10)).results.length,2);
  const result = await search(store,'generous whitespace',10,undefined,{domain:'web-ui',feature:'spacing',style:'editorial'});
  assert.equal(result.results.length,1);
  assert.equal(result.results[0].citation.url,examples[0].source.url);
  assert.equal(result.results[0].resource.design.features[0].imageUrl,examples[0].design.images[0].url);
  assert.equal((await search(store,'',10,undefined,{domain:'interior',style:'Japandi'})).results.length,1);
  assert.equal((await search(store,'wood',10,undefined,{domain:'app-ui'})).results.length,0);
  assert.equal((await search(store,'',10,undefined,{style:'Scandinavian'})).results.length,0);
});

test('source updates preserve but invalidate prior analysis; older callers cannot silently erase it', async t => {
  const store = join(await temporary(t),'memory.json');
  await putResources(store,[fixture()]);
  const update = {...fixture(), text:'Changed source',updatedAt:'2026-10-08T12:00:00Z'}; delete update.design;
  await putResources(store,[update]);
  const resources = (await readMemory(store)).resources;
  assert.equal(resources[0].design.status,'stale');
  assert.equal((await search(store,'',5,undefined,{style:'editorial'})).results.length,0);
  assert.equal(designGraph(resources).edges.length,0);
});

test('graph shares labels while retaining source-specific evidence and bounded nodes', () => {
  const resources = examples.map(validateResource);
  resources[1].design.styles[0].confirmation = 'User confirmed this label for this app reference.';
  const graph = designGraph(resources);
  const shared = graph.nodes.find(n => n.label === 'minimal editorial');
  const edges = graph.edges.filter(e => e.target === shared.id);
  assert.equal(edges.length,2); assert.equal(edges[0].hypothesis,true); assert.equal(edges[1].hypothesis,false);
  assert.notDeepEqual(edges[0].evidence,edges[1].evidence);
  assert.equal(graph.edges.filter(e => e.source === resources[4].id).length,0);
  const many = Array.from({length:1000},(_,i)=>({...resources[0],id:'fixture-'+i}));
  const capped = designGraph(many); assert.equal(capped.resources.length,100); assert.ok(capped.nodes.length<=300); assert.equal(capped.truncated,true);
});

test('design read API is opt-in, same-origin, filtered and never writes the gallery', async t => {
  const server = await startServer(t,{MEMORY_STORE:''});
  assert.equal((await server.request('/api/design',undefined,'GET')).status,409);
  const memory = join(await temporary(t),'memory.json'); await putResources(memory,examples);
  const enabled = await startServer(t,{MEMORY_STORE:memory});
  const before = await readFile(memory,'utf8');
  const response = await enabled.request('/api/design?domain=interior',undefined,'GET');
  assert.equal(response.status,200); assert.equal(response.data.resources.length,1);
  assert.equal((await enabled.request('/api/design',undefined,'GET',{Origin:'https://example.com'})).status,403);
  assert.equal((await enabled.request('/api/design',{})).status,404);
  assert.equal((await enabled.request('/api/bookmarks',undefined,'GET')).data.bookmarks.length,0);
  assert.equal(await readFile(memory,'utf8'),before);
});

test('CLI inspect → analyze → filtered search works on isolated synthetic data', async t => {
  const store = join(await temporary(t),'memory.json');
  const input = fixture(); delete input.design; await putResources(store,[input]);
  const id = (await readMemory(store)).resources[0].id;
  const cli = (args,input) => spawnSync(process.execPath,[join(root,'scripts/memory.mjs'),...args,'--store',store],{cwd:root,input,encoding:'utf8'});
  const inspected = JSON.parse(cli(['inspect',id]).stdout);
  assert.equal(cli(['analyze','-'],JSON.stringify({id,resourceRevision:inspected.resourceRevision,design:fixture().design})).status,0);
  const result = cli(['search','','--domain','web-ui','--feature','spacing']);
  assert.equal(result.status,0,result.stderr); assert.equal(JSON.parse(result.stdout).results.length,1);
});


test('gallery image capture keeps original pointers unanalyzed and invalidates changed media', () => {
  const media = [{type:'image',url:'https://example.com/new.png',alt:'Post says minimal'}];
  const first = capturedDesign(undefined,media);
  assert.equal(first.status,'unanalyzed'); assert.equal(first.images[0].observed,false); assert.equal(first.styles.length,0);
  assert.equal(capturedDesign(fixture().design,media).status,'stale');
  assert.deepEqual(capturedDesign(first,media),first);
});


test('hardware and architecture classify independently with observed evidence', async t => {
  const store = join(await temporary(t), 'memory.json');
  const hardware = fixture(); hardware.source.id = 'fictional-hardware'; hardware.design.domains[0].label = 'hardware';
  const architecture = fixture(); architecture.source.id = 'fictional-architecture'; architecture.design.domains[0].label = 'architecture';
  await putResources(store, [hardware, architecture]);
  assert.equal((await search(store, '', 5, undefined, {domain:'hardware'})).results[0].resource.source.id, 'fictional-hardware');
  assert.equal((await search(store, '', 5, undefined, {domain:'architecture'})).results[0].resource.source.id, 'fictional-architecture');
});
