import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, readdir, stat, open} from 'node:fs/promises';
import {join} from 'node:path';
import {readStore, writeStore, updateStore} from '../lib/store.mjs';
import {MAX_LIBRARY_BYTES} from '../lib/bookmarks.mjs';
import {temporary} from './helpers.mjs';

const valid = {version: 1, bookmarks: [{id: 'one'}]};

test('atomic store creates private directories and files with no leftover lock or temp files', async t => {
  const dir = await temporary(t);
  const store = join(dir, 'private', 'bookmarks.json');
  await updateStore(store, () => valid);
  assert.deepEqual(await readStore(store), valid);
  assert.equal((await stat(store)).mode & 0o777, 0o600);
  assert.equal((await stat(join(dir, 'private'))).mode & 0o777, 0o700);
  assert.deepEqual(await readdir(join(dir, 'private')), ['bookmarks.json']);
});

test('failed updates release the lock, preserve original bytes and allow a retry', async t => {
  const dir = await temporary(t), store = join(dir, 'bookmarks.json');
  await writeStore(store, valid);
  const original = await readFile(store, 'utf8');
  await assert.rejects(updateStore(store, data => {data.bookmarks.push({id: 'two'}); throw new Error('Aborted');}), /Aborted/);
  assert.equal(await readFile(store, 'utf8'), original);
  assert.deepEqual(await readdir(dir), ['bookmarks.json']);
  await updateStore(store, data => ({...data, bookmarks: [...data.bookmarks, {id: 'two'}]}));
  assert.equal((await readStore(store)).bookmarks.length, 2);
});

test('corrupt, unsupported and duplicate-ID stores fail closed without overwriting', async t => {
  const dir = await temporary(t), store = join(dir, 'bookmarks.json');
  for (const raw of ['not json', 'null', '{"version":2,"bookmarks":[]}', '{"version":1,"bookmarks":[null]}', '{"version":1,"bookmarks":[{"id":"one"},{"id":"one"}]}']) {
    await writeFile(store, raw);
    await assert.rejects(updateStore(store, () => valid));
    assert.equal(await readFile(store, 'utf8'), raw);
    assert.deepEqual(await readdir(dir), ['bookmarks.json']);
  }
});

test('invalid write results and record overflow cannot replace a healthy store', async t => {
  const dir = await temporary(t), store = join(dir, 'bookmarks.json');
  await writeStore(store, valid);
  const before = await readFile(store, 'utf8');
  for (const data of [null, {}, {version: 1, bookmarks: [{id: 42}]}, {version: 1, bookmarks: Array(50001).fill({id: 'one'})}]) {
    await assert.rejects(writeStore(store, data));
    assert.equal(await readFile(store, 'utf8'), before);
  }
});

test('oversized store is rejected before reading its contents', async t => {
  const dir = await temporary(t), store = join(dir, 'bookmarks.json');
  const handle = await open(store, 'w');
  await handle.truncate(MAX_LIBRARY_BYTES + 1);
  await handle.close();
  await assert.rejects(readStore(store), /100 MiB/);
});

test('serialized UTF-8 byte overflow cannot replace a healthy store', async t => {
  const dir = await temporary(t), store = join(dir, 'bookmarks.json');
  await writeStore(store, valid);
  const before = await readFile(store, 'utf8');
  await assert.rejects(writeStore(store, {...valid, metadata: '界'.repeat(Math.ceil(MAX_LIBRARY_BYTES / 3))}), /100 MiB/);
  assert.equal(await readFile(store, 'utf8'), before);
  assert.deepEqual(await readdir(dir), ['bookmarks.json']);
});
