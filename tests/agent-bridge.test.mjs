import test from 'node:test';
import assert from 'node:assert/strict';
import {bridge} from '../scripts/agent-bridge.mjs';
import {startServer} from './helpers.mjs';

test('bridge imports into the running server and verifies annotations without exposing records', async t => {
  const {base, request} = await startServer(t);
  assert.equal((await bridge('doctor', base)).total, 0);
  const b = {id: 'synthetic-agent-1', text: 'Fictional post: test one behavior.', summary: 'Test one behavior.', tags: ['Testing'], enrichment: {kind:'agent', agent:'Synthetic test fixture', generatedAt:'2026-10-03T00:00:00Z', basis:'Synthetic text'}};
  const first = await bridge('import', base, JSON.stringify({bookmarks:[b]}));
  assert.equal(first.added, 1); assert.equal(first.annotationMatches, 1); assert.equal(first.verifiedPresent, 1);
  assert.equal(JSON.stringify(first).includes(b.text), false);
  await request('/api/bookmarks/synthetic-agent-1', {summary:'Local user edit',note:'Private note',favorite:true}, 'PUT');
  const repeat = await bridge('import', base, JSON.stringify({bookmarks:[b]}));
  assert.equal(repeat.added, 0); assert.equal(repeat.annotationsPreserved, 1);
  const {data} = await request('/api/bookmarks', undefined, 'GET');
  assert.equal(data.bookmarks[0].note, 'Private note');assert.equal(data.bookmarks[0].favorite, true);
});
test('bridge rejects unsafe destinations before sending data', async () => {
  for (const url of ['https://example.com','http://127.0.0.1:4317/path','http://a:b@127.0.0.1:4317','http://localhost:4317','http://127.0.0.1:4317/?token=x']) {
    await assert.rejects(bridge('import',url,'{}'), /loopback/);
  }
});
test('bridge rejects malformed and tool-error payloads without changing library', async t => {
  const {base} = await startServer(t);
  for (const input of ['{broken','{"isError":true,"content":[]}','{"bookmarks":[]}']) await assert.rejects(bridge('import',base,input));
  assert.equal((await bridge('doctor',base)).total,0);
});
