import {loadSource} from './source.js';
import {pullResources, pendingDistillation, distillResources} from './pull.js';
import {readFile, stat} from 'node:fs/promises';
import {errorMessage} from '../shared/types.js';
import {normalizeLibrary} from '../shared/bookmarks.js';
import {readStore} from '../server/store.js';
import {DEFAULT_MEMORY_STORE, readMemory, updateMemory} from './store.js';
import {resourceId, validateResource, digest} from './model.js';
import {loadProvider} from './provider.js';
import {
  applyResources,
  putResources,
  deleteResource,
  syncResources,
  search,
  status,
} from './service.js';

const HELP = `xstash resource memory — local by default; no implicit remote provider

node scripts/memory.mjs pull --source-config FILE [--max-pages 10] [--restart] [--store FILE]
node scripts/memory.mjs pending [--limit 20] [--store FILE]
node scripts/memory.mjs distill FILE|- [--store FILE]
node scripts/memory.mjs capture --bookmarks FILE [--store FILE]
node scripts/memory.mjs put FILE|- [--store FILE]
node scripts/memory.mjs search "task keywords" [--limit 5] [--provider-config FILE] [--store FILE]
node scripts/memory.mjs get RESOURCE_ID [--store FILE]
node scripts/memory.mjs delete RESOURCE_ID [--store FILE]
node scripts/memory.mjs status [--provider-config FILE] [--store FILE]
node scripts/memory.mjs sync (--id RESOURCE_ID|--all) --provider-config FILE [--store FILE]

put accepts a complete resource or array. Unknown purpose/useWhen/limitations stay
empty; unknown savedReason is null. capture only reads the explicitly named local
bookmark file; no network, gallery writes or remote sync. Source + source ID dedupe.
Search emits private content to stdout. Sync requires a user-selected trusted
adapter/config; selection is explicit. Delete stays pending until explicit sync.
See docs/MEMORY.md for schemas, acknowledgements and provider boundaries.
`;
async function input(path: string): Promise<unknown> {
  const max = 10 * 1024 * 1024;
  let raw = '';
  if (path === '-') {
    let size = 0;
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) {
      size += Buffer.byteLength(chunk);
      if (size > max) throw new Error('Input exceeds 10 MiB.');
      raw += chunk.toString();
    }
  } else {
    if ((await stat(path)).size > max) throw new Error('Input exceeds 10 MiB.');
    raw = await readFile(path, 'utf8');
  }
  if (Buffer.byteLength(raw) > max) throw new Error('Input exceeds 10 MiB.');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid resource JSON.');
  }
}
export async function runMemoryCli(args = process.argv.slice(2)) {
  try {
    const command = args.shift();
    if (command === '--help' || command === '-h') {
      console.log(HELP);
      return;
    }
    const allowed: Record<string, string[]> = {
      put: [],
      pull: ['--source-config', '--max-pages', '--restart'],
      pending: ['--limit'],
      distill: [],
      get: [],
      capture: ['--bookmarks'],
      delete: [],
      status: ['--provider-config'],
      search: ['--provider-config', '--limit'],
      sync: ['--provider-config', '--id', '--all'],
    };
    if (!command || !allowed[command]) throw new Error(HELP);
    const options: Record<string, string> = {};
    const positional: string[] = [];
    const valid = new Set(['--store', ...allowed[command]!]);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]!;
      if (!arg.startsWith('--')) {
        positional.push(arg);
        continue;
      }
      if (!valid.has(arg) || options[arg] !== undefined)
        throw new Error(`Unknown or duplicate option: ${arg}`);
      if (arg === '--all' || arg === '--restart') {
        options[arg] = 'true';
        continue;
      }
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      options[arg] = value;
    }
    const expected = ['put', 'get', 'delete', 'search', 'distill'].includes(command) ? 1 : 0;
    if (positional.length !== expected)
      throw new Error(`Invalid arguments for ${command}. Use --help.`);
    const store = options['--store'] ?? DEFAULT_MEMORY_STORE;
    const provider = options['--provider-config']
      ? await loadProvider(options['--provider-config'], store)
      : undefined;
    let result: unknown;
    if (command === 'pull') {
      if (!options['--source-config'])
        throw new Error('Select an authorized source adapter with --source-config.');
      const pulled = await pullResources(
        store,
        await loadSource(options['--source-config']),
        Number(options['--max-pages'] ?? 10),
        Boolean(options['--restart']),
      );
      if (pulled.state === 'failed') process.exitCode = 1;
      result = pulled;
    } else if (command === 'pending') {
      result = await pendingDistillation(store, Number(options['--limit'] ?? 20));
    } else if (command === 'distill') {
      result = await distillResources(store, await input(positional[0]!));
    } else if (command === 'put') {
      const data = await input(positional[0]!);
      result = await putResources(store, Array.isArray(data) ? data : [data]);
    } else if (command === 'get') {
      result = (await readMemory(store)).resources.find((r) => r.id === positional[0]);
      if (!result) throw new Error('Resource not found.');
    } else if (command === 'capture') {
      if (!options['--bookmarks'])
        throw new Error('Capture requires --bookmarks FILE; no library is selected automatically.');
      const library = normalizeLibrary(await readStore(options['--bookmarks']));
      result = await updateMemory(store, (data) => {
        const resources = library.bookmarks
          .map((bookmark) => {
            const id = resourceId('x', bookmark.id);
            const old = data.resources.find((r) => r.id === id);
            // Capture never resurrects an explicitly removed resource or erases agent/user distillation.
            if (data.tombstones.some((t) => t.id === id)) return null;
            const resource = validateResource({
              source: {provider: 'x', id: bookmark.id, url: bookmark.url},
              title: old?.title ?? bookmark.text.slice(0, 120),
              text: bookmark.text,
              summary: old?.summary ?? bookmark.summary,
              purpose: old?.purpose ?? '',
              useWhen: old?.useWhen ?? [],
              limitations: old?.limitations ?? [],
              savedReason: old?.savedReason ?? null,
              updatedAt: old?.updatedAt ?? new Date().toISOString(),
            });
            if (old && old.text !== resource.text)
              resource.limitations = [
                ...new Set([
                  ...resource.limitations,
                  'Source text changed; review previous distillation before use.',
                ]),
              ];
            if (old && digest(resource) !== digest(old))
              resource.updatedAt = new Date(
                Math.max(Date.now(), Date.parse(old.updatedAt) + 1),
              ).toISOString();
            return resource;
          })
          .filter((r) => r !== null);
        return {
          ...applyResources(data, resources),
          skippedDeleted: library.bookmarks.length - resources.length,
        };
      });
    } else if (command === 'delete') result = await deleteResource(store, positional[0]!);
    else if (command === 'status') result = await status(store, provider);
    else if (command === 'search') {
      const query = positional[0]!.trim();
      const limit = Number(options['--limit'] ?? 5);
      if (!query || query.length > 2000 || !Number.isInteger(limit) || limit < 1 || limit > 20)
        throw new Error('Use a nonempty query (max 2,000 characters), and limit 1–20.');
      result = await search(store, query, limit, provider);
    } else {
      if (!provider)
        throw new Error(
          'Memory provider not configured; resources remain local and unsynced. Select a personal provider explicitly.',
        );
      if (Boolean(options['--all']) === Boolean(options['--id']))
        throw new Error('Select exactly one of --id RESOURCE_ID or --all.');
      const synced = await syncResources(store, provider, options['--id'] ?? 'all');
      if (synced.failures.length || synced.skippedPending) process.exitCode = 1;
      result = synced;
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 1;
  }
}
