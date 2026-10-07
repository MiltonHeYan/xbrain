import {spawn} from 'node:child_process';
import {readFile, realpath} from 'node:fs/promises';
import {isAbsolute, resolve, dirname, basename, join} from 'node:path';
import {isObject, errorCode} from '../shared/types.js';
import {digest, searchResources, validateResource} from './model.js';
import type {Resource} from './model.js';
import {readMemory, updateMemory} from './store.js';

export interface MemoryProvider {
  key: string;
  kind: 'file' | 'command';
  upsert(resource: Resource, revision: string): Promise<void>;
  delete(id: string, revision: string): Promise<void>;
  search(query: string, limit: number): Promise<Resource[]>;
}
export const PROTOCOL = 'xstash.memory.v1';
export async function loadProvider(
  configPath: string,
  localStore: string,
): Promise<MemoryProvider> {
  const raw = await readFile(configPath, 'utf8');
  if (raw.length > 16000) throw new Error('Provider config exceeds 16 KiB.');
  let config: unknown;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error('Invalid provider config JSON.');
  }
  if (!isObject(config) || config.scope !== 'personal')
    throw new Error(
      'Provider config must explicitly select scope: personal. Shared memory is not supported.',
    );
  if (config.kind === 'file') {
    if (typeof config.path !== 'string' || !isAbsolute(config.path))
      throw new Error('File provider requires an absolute path.');
    const path = config.path;
    const canonical = async (p: string): Promise<string> => {
      p = resolve(p);
      try {
        return await realpath(p);
      } catch (error) {
        if (errorCode(error) !== 'ENOENT') throw error;
        return join(await canonical(dirname(p)), basename(p));
      }
    };
    if ((await canonical(path)) === (await canonical(localStore)))
      throw new Error('Provider path must differ from the local resource store.');
    const key = digest({kind: 'file', path: await canonical(path), scope: 'personal'});
    return {
      key,
      kind: 'file',
      async upsert(resource) {
        await updateMemory(path, (data) => {
          const old = data.resources.find((r) => r.id === resource.id);
          if (
            old &&
            (old.updatedAt > resource.updatedAt ||
              (old.updatedAt === resource.updatedAt && digest(old) !== digest(resource)))
          )
            throw new Error('Provider has a newer or conflicting resource.');
          data.resources = [...data.resources.filter((r) => r.id !== resource.id), resource];
          data.tombstones = data.tombstones.filter((r) => r.id !== resource.id);
        });
      },
      async delete(id) {
        await updateMemory(path, (data) => {
          data.resources = data.resources.filter((r) => r.id !== id);
          delete data.ingestion.pending[id];
        });
      },
      async search(query, limit) {
        return searchResources((await readMemory(path)).resources, query, limit).map(
          (h) => h.resource,
        );
      },
    };
  }
  if (
    config.kind !== 'command' ||
    !Array.isArray(config.command) ||
    config.command.length < 1 ||
    config.command.length > 10 ||
    !config.command.every((s) => typeof s === 'string' && s.length < 4096) ||
    !isAbsolute(config.command[0]) ||
    typeof config.namespace !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(config.namespace)
  )
    throw new Error(
      'Expected file provider or an absolute trusted command, personal scope and namespace.',
    );
  const command = config.command as string[];
  const namespace = config.namespace;
  const key = digest({kind: 'command', command, namespace, scope: 'personal'});
  async function request(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // No shell interpolation, source contents only on stdin; credentials stay in adapter-owned configuration.
    const response = await new Promise<string>((resolveResponse, reject) => {
      const child = spawn(command[0]!, command.slice(1), {stdio: ['pipe', 'pipe', 'pipe']});
      let output = '';
      let bytes = 0;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) {
          child.kill();
          reject(error);
        } else resolveResponse(output);
      };
      const timer = setTimeout(
        () => finish(new Error('Memory adapter timed out; sync not confirmed.')),
        15000,
      );
      child.once('error', () => finish(new Error('Memory adapter could not start.')));
      child.stdin.on('error', () => finish(new Error('Memory adapter closed its input.')));
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > 1024 * 1024) finish(new Error('Memory adapter response exceeds 1 MiB.'));
        else output += chunk;
      });
      // Do not leak adapter errors, which may contain provider credentials or source content.
      child.stderr.resume();
      child.once('close', (code) =>
        finish(code === 0 ? undefined : new Error('Memory adapter failed; sync not confirmed.')),
      );
      child.stdin.end(JSON.stringify({protocol: PROTOCOL, namespace, ...payload}) + '\n');
    });
    let data: unknown;
    try {
      data = JSON.parse(response);
    } catch {
      throw new Error('Memory adapter returned invalid JSON.');
    }
    if (!isObject(data) || data.protocol !== PROTOCOL || data.ok !== true)
      throw new Error('Memory adapter did not confirm the operation.');
    return data;
  }
  async function mutate(operation: string, id: string, revision: string, resource?: Resource) {
    const result = await request({operation, id, revision, ...(resource ? {resource} : {})});
    if (result.id !== id || result.revision !== revision)
      throw new Error('Memory adapter acknowledgement does not match the resource/revision.');
  }
  return {
    key,
    kind: 'command',
    upsert: (resource, revision) => mutate('upsert', resource.id, revision, resource),
    delete: (id, revision) => mutate('delete', id, revision),
    async search(query, limit) {
      const result = await request({operation: 'search', query, limit});
      if (!Array.isArray(result.resources) || result.resources.length > 50)
        throw new Error('Invalid memory adapter search results.');
      const resources = result.resources.map(validateResource);
      if (new Set(resources.map((r) => r.id)).size !== resources.length)
        throw new Error('Duplicate memory adapter search results.');
      return resources;
    },
  };
}
