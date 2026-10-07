import {readFile, writeFile, mkdir, rename, unlink, open, stat} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {errorCode, isObject} from '../shared/types.js';
import {validateResource, timestamp} from './model.js';
import type {Resource} from './model.js';
import {emptyIngestion, validateIngestion} from './ingestion-state.js';
import type {IngestionState} from './ingestion-state.js';

export const DEFAULT_MEMORY_STORE = fileURLToPath(
  new URL('../../data/resource-memory.json', import.meta.url),
);
export interface MemoryData {
  version: 1;
  resources: Resource[];
  tombstones: {id: string; deletedAt: string}[];
  receipts: Record<string, Record<string, string>>;
  ingestion: IngestionState;
}
const MAX_BYTES = 20 * 1024 * 1024;
function validate(input: unknown): MemoryData {
  if (
    !isObject(input) ||
    input.version !== 1 ||
    !Array.isArray(input.resources) ||
    !Array.isArray(input.tombstones) ||
    !isObject(input.receipts)
  )
    throw new Error('Invalid memory store; refusing to overwrite.');
  if (input.resources.length + input.tombstones.length > 10000)
    throw new Error('Memory store exceeds 10,000 entries.');
  const resources = input.resources.map(validateResource);
  const ids = new Set(resources.map((r) => r.id));
  if (ids.size !== resources.length) throw new Error('Duplicate resource IDs.');
  const tombstones = input.tombstones.map((item) => {
    if (
      !isObject(item) ||
      typeof item.id !== 'string' ||
      !/^resource_[a-f0-9]{64}$/.test(item.id) ||
      ids.has(item.id)
    )
      throw new Error('Invalid or duplicate tombstone.');
    ids.add(item.id);
    return {id: item.id, deletedAt: timestamp(item.deletedAt)};
  });
  const receipts: MemoryData['receipts'] = {};
  for (const [target, value] of Object.entries(input.receipts)) {
    if (!/^[a-f0-9]{64}$/.test(target) || !isObject(value))
      throw new Error('Invalid sync receipt.');
    receipts[target] = {};
    for (const [id, revision] of Object.entries(value)) {
      if (
        !/^resource_[a-f0-9]{64}$/.test(id) ||
        typeof revision !== 'string' ||
        !/^[a-f0-9]{64}$/.test(revision)
      )
        throw new Error('Invalid sync receipt.');
      receipts[target]![id] = revision;
    }
  }
  return {
    version: 1,
    resources,
    tombstones,
    receipts,
    ingestion: validateIngestion(input.ingestion),
  };
}
export async function readMemory(path = DEFAULT_MEMORY_STORE): Promise<MemoryData> {
  let raw: string;
  try {
    if ((await stat(path)).size > MAX_BYTES) throw new Error('Memory store exceeds 20 MiB.');
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (errorCode(error) === 'ENOENT')
      return {version: 1, resources: [], tombstones: [], receipts: {}, ingestion: emptyIngestion()};
    throw error;
  }
  if (Buffer.byteLength(raw) > MAX_BYTES) throw new Error('Memory store exceeds 20 MiB.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid memory store JSON; refusing to overwrite.');
  }
  return validate(parsed);
}
export async function updateMemory<T>(
  path: string,
  update: (data: MemoryData) => T | Promise<T>,
): Promise<T> {
  path = resolve(path);
  await mkdir(dirname(path), {recursive: true, mode: 0o700});
  let handle;
  try {
    handle = await open(`${path}.lock`, 'wx', 0o600);
  } catch (error) {
    if (errorCode(error) === 'EEXIST')
      throw new Error('Memory store is busy; retry after the other command finishes.');
    throw error;
  }
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    const data = await readMemory(path);
    const result = await update(data);
    const raw = JSON.stringify(validate(data), null, 2) + '\n';
    if (Buffer.byteLength(raw) > MAX_BYTES) throw new Error('Memory store exceeds 20 MiB.');
    await writeFile(temp, raw, {flag: 'wx', mode: 0o600});
    await rename(temp, path);
    return result;
  } finally {
    await unlink(temp).catch(() => {});
    await handle.close();
    await unlink(`${path}.lock`);
  }
}
