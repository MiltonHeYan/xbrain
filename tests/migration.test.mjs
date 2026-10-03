import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {normalizeImport,normalizeLibrary} from '../lib/bookmarks.mjs';
import {readStore,DEFAULT_STORE} from '../lib/store.mjs';
import {temporary,root,runCli,startServer} from './helpers.mjs';

test('TypeScript store reads v1 bytes without rewriting and keeps project-relative default',async t=>{
 const dir=await temporary(t),file=join(dir,'v1.json');
 const original=JSON.stringify({version:1,bookmarks:normalizeImport([{id:'migration-synthetic',text:'Fictional legacy record',note:'Keep this',favorite:true,tags:['Legacy'],summary:'User annotation',enrichment:{kind:'user'}}]).bookmarks},null,4);
 await writeFile(file,original,{mode:0o600});
 assert.equal((await readStore(file)).bookmarks[0].note,'Keep this');
 assert.equal(await readFile(file,'utf8'),original);
 assert.equal(DEFAULT_STORE,join(root,'data/bookmarks.json'));
 const backup=join(dir,'export.json'),restored=join(dir,'restored.json');
 assert.equal(runCli(['export','--store',file,'--output',backup]).status,0);
 assert.equal(runCli(['restore',backup,'--store',restored]).status,0);
 assert.deepEqual(normalizeLibrary(await readFile(restored,'utf8')).bookmarks,normalizeLibrary(original).bookmarks);
});
test('Vite bundle is served by the Node API origin and never exposes source or build service files',async t=>{
 const {base}=await startServer(t);
 const html=await (await fetch(base)).text();
 assert.match(html,/<div id="root"><\/div>/);
 const asset=html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
 const response=await fetch(base+asset);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/javascript/);
 for(const path of ['/src/server/store.ts','/.build/server/server.js','/package-lock.json','/.git/config'])assert.equal((await fetch(base+path)).status,404);
});
