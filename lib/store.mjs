import {readFile, writeFile, mkdir, rename, unlink, open, stat} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {MAX_LIBRARY_BOOKMARKS, MAX_LIBRARY_BYTES} from './bookmarks.mjs';

export const DEFAULT_STORE = fileURLToPath(new URL('../data/bookmarks.json', import.meta.url));

function validateStore(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.bookmarks)) {
    throw new Error('Invalid store; existing data was not overwritten.');
  }
  if (data.bookmarks.length > MAX_LIBRARY_BOOKMARKS) throw new Error('Library exceeds the 50,000 bookmark limit.');
  const ids = new Set();
  for (const bookmark of data.bookmarks) {
    if (!bookmark || typeof bookmark !== 'object' || Array.isArray(bookmark) ||
        typeof bookmark.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(bookmark.id) || ids.has(bookmark.id)) {
      throw new Error('Invalid bookmark or duplicate ID in store; existing data was not overwritten.');
    }
    ids.add(bookmark.id);
  }
}

export async function readStore(path = DEFAULT_STORE) {
  let raw;
  try {
    const info = await stat(path);
    if (info.size > MAX_LIBRARY_BYTES) throw new Error('Store exceeds 100 MiB.');
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return {version: 1, bookmarks: []};
    throw error;
  }
  if (Buffer.byteLength(raw) > MAX_LIBRARY_BYTES) throw new Error('Store exceeds 100 MiB.');
  const data = JSON.parse(raw);
  validateStore(data);
  return data;
}

/** Caller must hold the updateStore lock for a read-modify-write transaction. */
export async function writeStore(path = DEFAULT_STORE, data) {
  validateStore(data);
  const serialized = JSON.stringify(data, null, 2) + '\n';
  // Check the exact on-disk representation before replacing a readable store.
  if (Buffer.byteLength(serialized) > MAX_LIBRARY_BYTES) throw new Error('Store exceeds 100 MiB.');
  await mkdir(dirname(resolve(path)), {recursive: true, mode: 0o700});
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, serialized, {mode: 0o600, flag: 'wx'});
    await rename(temp, path);
  } finally {
    await unlink(temp).catch(() => {});
  }
}

export async function updateStore(path = DEFAULT_STORE, updater) {
  path = resolve(path);
  await mkdir(dirname(path), {recursive: true, mode: 0o700});
  const lock = path + '.lock';
  let handle;
  const deadline = Date.now() + 5000;
  while (!handle) {
    try {
      handle = await open(lock, 'wx', 0o600);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() > deadline) throw new Error('Store is busy. If a process crashed, verify it stopped before removing the .lock file.');
      await new Promise(resolve => setTimeout(resolve, 40));
    }
  }
  try {
    const result = await updater(await readStore(path));
    await writeStore(path, result);
    return result;
  } finally {
    await handle.close();
    await unlink(lock);
  }
}
