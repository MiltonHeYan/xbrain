import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile, readFile, stat, readdir, open} from 'node:fs/promises';
import {join} from 'node:path';
import {readStore, writeStore, updateStore} from '../lib/store.mjs';
import {normalizeImport, MAX_IMPORT_BYTES, MAX_LIBRARY_BYTES} from '../lib/bookmarks.mjs';
import {temporary, runCli, runCliAsync} from './helpers.mjs';

const row = {id: '1900000000000000001', text: 'Synthetic bookmark', tags: ['Test']};
const success = args => {
  const result = runCli(args);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};

test('CLI help is successful and unknown/malformed commands fail clearly', () => {
  for (const arg of ['--help', '-h']) {
    const result = runCli([arg]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /restore BACKUP/);
    assert.match(result.stdout, /never delete/);
  }
  for (const args of [[], ['unknown'], ['import'], ['stats', '--store'], ['stats', '--output', 'a'], ['export', '--mystery'], ['restore', 'a', 'b']]) {
    const result = runCli(args);
    assert.equal(result.status, 1, args.join(' '));
    assert.match(result.stderr, /Usage|Missing value/);
  }
});

test('CLI import reports deduplicated counts and export round-trips private annotations', async t => {
  const dir = await temporary(t), store = join(dir, 'store.json'), input = join(dir, 'input.json'), output = join(dir, 'export.json');
  await writeFile(input, JSON.stringify([row, row]));
  assert.equal(success(['import', input, '--store', store]).added, 1);
  assert.equal(success(['import', input, '--store', store]).added, 0);
  await updateStore(store, data => {
    Object.assign(data.bookmarks[0], {favorite: true, note: 'Private note', tags: [], summary: '', enrichment: {kind: 'user'}});
    return data;
  });
  const stats = success(['stats', '--store', store]);
  assert.deepEqual(stats, {total: 1, favorites: 1, tags: 0});
  const result = runCli(['export', '--store', store, '--output', output], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((await stat(output)).mode & 0o777, 0o600);
  const restored = join(dir, 'restored.json');
  assert.equal(success(['restore', output, '--store', restored]).added, 1);
  assert.deepEqual((await readStore(restored)).bookmarks, (await readStore(store)).bookmarks);
});

test('CLI export never overwrites an existing destination or the active store', async t => {
  const dir = await temporary(t), store = join(dir, 'store.json'), output = join(dir, 'export.json');
  await writeStore(store, {version: 1, bookmarks: normalizeImport([row]).bookmarks});
  await writeFile(output, 'KEEP');
  const before = await readFile(store, 'utf8');
  for (const target of [output, store]) assert.equal(runCli(['export', '--store', store, '--output', target]).status, 1);
  assert.equal(await readFile(output, 'utf8'), 'KEEP');
  assert.equal(await readFile(store, 'utf8'), before);
});

test('CLI empty or malformed imports fail without creating or altering a store', async t => {
  const dir = await temporary(t), store = join(dir, 'store.json'), input = join(dir, 'input.json');
  for (const value of ['[]', '[null]', 'null', '{"isError":true}', 'not json']) {
    await writeFile(input, value);
    assert.equal(runCli(['import', input, '--store', store]).status, 1);
    await assert.rejects(stat(store), {code: 'ENOENT'});
  }
  await writeStore(store, {version: 1, bookmarks: normalizeImport([row]).bookmarks});
  const before = await readFile(store, 'utf8');
  assert.equal(runCli(['import', input, '--store', store]).status, 1);
  assert.equal(await readFile(store, 'utf8'), before);
});

test('CLI restore supports more than 10,000 records and preserves existing local edits', async t => {
  const dir = await temporary(t), store = join(dir, 'store.json'), backup = join(dir, 'backup.json');
  const existing = normalizeImport([{id: '0', text: 'Old text', note: 'Local note', tags: [], summary: '', enrichment: {kind: 'user'}}, {id: 'only-local', text: 'Keep me'}]).bookmarks;
  await writeStore(store, {version: 1, bookmarks: existing});
  await writeFile(backup, JSON.stringify({schemaVersion: 1, bookmarks: Array.from({length: 10001}, (_, index) => ({id: String(index), text: 'Restored text', tags: ['Imported'], summary: 'Imported summary'}))}));
  assert.equal(runCli(['import', backup, '--store', store]).status, 1);
  const result = success(['restore', backup, '--store', store]);
  assert.equal(result.total, 10002);
  const library = (await readStore(store)).bookmarks;
  const first = library.find(bookmark => bookmark.id === '0');
  assert.equal(first.text, 'Restored text');
  assert.equal(first.note, 'Local note');
  assert.equal(first.summary, '');
  assert.deepEqual(first.tags, []);
  assert.ok(library.some(bookmark => bookmark.id === 'only-local'));
});

test('CLI restore rejects raw snapshots, duplicate IDs and unsupported backup versions', async t => {
  const dir = await temporary(t), store = join(dir, 'store.json'), backup = join(dir, 'backup.json');
  for (const value of [[row], {bookmarks: [row]}, {version: 2, bookmarks: [row]}, {version: 1, bookmarks: [row, row]}, {version: 1, bookmarks: [row, null]}]) {
    await writeFile(backup, JSON.stringify(value));
    assert.equal(runCli(['restore', backup, '--store', store]).status, 1);
    await assert.rejects(stat(store), {code: 'ENOENT'});
  }
});

test('CLI checks import and backup byte limits before parsing', async t => {
  const dir = await temporary(t), store = join(dir, 'store.json'), input = join(dir, 'huge.json');
  for (const [command, size, message] of [['import', MAX_IMPORT_BYTES + 1, /10 MiB/], ['restore', MAX_LIBRARY_BYTES + 1, /100 MiB/]]) {
    const handle = await open(input, 'w');
    await handle.truncate(size);
    await handle.close();
    const result = runCli([command, input, '--store', store]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    await assert.rejects(stat(store), {code: 'ENOENT'});
  }
});

test('multiple independent CLI processes serialize store updates without losing records', async t => {
  const dir = await temporary(t), store = join(dir, 'store.json');
  const inputs = await Promise.all(Array.from({length: 8}, async (_, index) => {
    const input = join(dir, `input-${index}.json`);
    await writeFile(input, JSON.stringify([{...row, id: `concurrent-${index}`} ]));
    return input;
  }));
  const results = await Promise.all(inputs.map(input => runCliAsync(['import', input, '--store', store])));
  assert.ok(results.every(result => result.status === 0), results.map(result => result.stderr).join('\n'));
  assert.equal((await readStore(store)).bookmarks.length, 8);
  assert.ok(!(await readdir(dir)).some(name => name.endsWith('.lock') || name.endsWith('.tmp')));
});
