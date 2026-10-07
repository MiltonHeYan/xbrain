import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile, readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {temporary, root} from './helpers.mjs';
import {snapshotPage, verifyPersonalAccount} from '../.build/adapters/corespeed-source.js';
const account = '@fixtureUser';
const request = {protocol:'xstash.source.v1',operation:'fetch',provider:'x',account,cursor:null,checkpoint:null,limit:100};
const accounts = [{connector:'twitter',alias:account,identity:account,member_scope:true},{connector:'twitter',alias:'@fixtureOrg',identity:'@fixtureOrg',member_scope:false}];
const result = {isError:false,content:[{type:'text',text:JSON.stringify({data:[{id:'1234567890123456789',text:'Fictional React resource'}],meta:{result_count:1,next_token:'fixture-pagination-token'}})}]};
const snapshot = () => ({format:'xstash.corespeed-snapshot.v1',account,accounts,fetchedAt:new Date().toISOString(),result});
const run = (args,r=request) => {
 const child=spawnSync(process.execPath,[join(root,'scripts/corespeed-source.mjs'),...args],{input:JSON.stringify(r),encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout);
};
test('optional snapshot adapter preserves original IDs, honest partial coverage and unknown update time',()=>{
 const page=snapshotPage(snapshot(),request,12);
 assert.equal(page.items.length,1);assert.equal(page.items[0].url,'https://x.com/i/web/status/1234567890123456789');
 assert.equal(page.items[0].updatedAt,null);assert.equal(page.nextCursor,null);assert.equal(page.checkpoint,null);assert.equal(page.coverage,'partial');
});
test('personal account selection rejects organization substitution, mismatches and ambiguity',()=>{
 assert.equal(verifyPersonalAccount(accounts,account),account);
 assert.throws(()=>verifyPersonalAccount(accounts,'@fixtureOrg'),/access_denied/);
 assert.throws(()=>verifyPersonalAccount([...accounts,accounts[0]],account),/access_denied/);
 assert.throws(()=>snapshotPage({...snapshot(),account:'@other'},request,12),/access_denied/);
});
test('stale/error/malformed snapshots fail without silently importing or exposing diagnostic text',async(t)=>{
 const dir=await temporary(t,'xstash-source-adapter-'), file=join(dir,'snapshot.json');
 for(const data of [
  {...snapshot(),fetchedAt:'2000-01-01T00:00:00Z'},
  {...snapshot(),result:{isError:true,content:[{type:'text',text:'secret diagnostic must not be printed'}]}},
  {...snapshot(),result:{isError:false,structuredContent:{data:[{id:123,text:'unsafe numeric id'}]}}}
 ]){
  await writeFile(file,JSON.stringify(data));const response=run(['--snapshot',file]);
  assert.equal(response.ok,false);assert.equal(JSON.stringify(response).includes('secret'),false);
 }
 await writeFile(file,JSON.stringify(snapshot()));
 assert.equal(run(['--snapshot',file],{...request,cursor:'unsupported'}).ok,false);
 assert.equal(run(['--snapshot',file]).items.length,1);
});
test('CLI mode verifies account and schema before fetching; uses only official read-only commands',async(t)=>{
 const dir=await temporary(t,'xstash-cli-adapter-'), cli=join(dir,'mock-cli.mjs'), log=join(dir,'calls.jsonl');
 await writeFile(cli,`import {appendFileSync} from 'node:fs';const a=process.argv.slice(2);appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+'\\n');const out=a[1]==='get'?{name:'twitter__get_my_bookmarks',inputSchema:{properties:{account:{type:'string'},max_results:{type:'number'}},required:[]}}:a[2]==='manage__accounts_list'?{isError:false,structuredContent:${JSON.stringify(accounts)}}:${JSON.stringify(result)};console.log(JSON.stringify(out));`);
 const response=run(['--cli',cli,'--max-results','12']);assert.equal(response.ok,true);
 const calls=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);
 assert.deepEqual(calls.map(c=>c[2]),['manage__accounts_list','twitter__get_my_bookmarks','twitter__get_my_bookmarks']);
 assert.deepEqual(JSON.parse(calls[2][3]),{account,max_results:12});
});
test('CLI auth/approval errors stop without falling back to snapshot, account or credential creation',async(t)=>{
 const dir=await temporary(t,'xstash-cli-refusal-'), cli=join(dir,'mock-cli.mjs');
 for(const [exit,code] of [[3,'authorization_required'],[6,'access_denied'],[5,'unavailable']]){
  await writeFile(cli,`console.error('private diagnostics');process.exit(${exit});`);
  assert.deepEqual(run(['--cli',cli]),{protocol:'xstash.source.v1',ok:false,code});
 }
});
