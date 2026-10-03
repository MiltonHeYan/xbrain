import {isObject, errorMessage} from '../shared/types.js';
import type {Library} from '../shared/types.js';
import {normalizeImport, normalizeLibrary, MAX_IMPORT_BYTES} from '../shared/bookmarks.js';

// No credentials, MCP transport, or model calls: the agent owns those boundaries.
export async function bridge(command: string, target: string, input = '') {
  const url = new URL(target);
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Use an explicit http://127.0.0.1:PORT loopback origin.');
  }
  if (!['doctor', 'import'].includes(command)) throw new Error('Expected doctor or import.');
  async function request(route: string, payload?: unknown): Promise<Library> {
    const response = await fetch(new URL(route, url), {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      ...(payload
        ? {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
          }
        : {}),
    });
    if (!response.ok)
      throw new Error(
        `Local gallery returned HTTP ${response.status}; inspect locally, do not retry blindly.`,
      );
    const data: unknown = await response.json();
    if (!isObject(data) || data.version !== 1 || !Array.isArray(data.bookmarks))
      throw new Error('Endpoint is not a compatible gallery.');
    return {version: 1, bookmarks: normalizeLibrary(data).bookmarks};
  }
  const before = await request('/api/bookmarks');
  if (command === 'doctor') return {ok: true, origin: url.origin, total: before.bookmarks.length};
  if (Buffer.byteLength(input) > MAX_IMPORT_BYTES) throw new Error('Import exceeds 10 MiB.');
  const normalized = normalizeImport(input);
  if (!normalized.bookmarks.length) throw new Error('No valid bookmarks; nothing imported.');
  const posted = await request('/api/import', {
    bookmarks: normalized.bookmarks,
    source: normalized.source,
  });
  const after = await request('/api/bookmarks');
  const byId = new Map(after.bookmarks.map((b) => [b.id, b]));
  if (normalized.bookmarks.some((b) => !byId.has(b.id)))
    throw new Error('Read-back verification failed after import; inspect before retrying.');
  if (
    normalized.bookmarks.some(
      (b) => b.sourceFields?.text !== false && byId.get(b.id)?.text !== b.text,
    )
  )
    throw new Error('Source text read-back mismatch; inspect before retrying.');
  const beforeIds = new Set(before.bookmarks.map((b) => b.id));
  const annotationMatches = normalized.bookmarks.filter((b) => {
    const saved = byId.get(b.id);
    return saved?.summary === b.summary && JSON.stringify(saved?.tags) === JSON.stringify(b.tags);
  }).length;
  return {
    ok: true,
    origin: url.origin,
    received: normalized.bookmarks.length,
    total: after.bookmarks.length,
    added: posted.bookmarks.filter((b) => !beforeIds.has(b.id)).length,
    verifiedPresent: normalized.bookmarks.length,
    annotationMatches,
    annotationsPreserved: normalized.bookmarks.length - annotationMatches,
    warningCount: normalized.warnings.length,
    coverage: 'partial',
  };
}

export async function runBridgeCli(): Promise<void> {
  try {
    const [command, target, ...extra] = process.argv.slice(2);
    if (!command || !target || extra.length)
      throw new Error(
        'Usage: node scripts/agent-bridge.mjs doctor|import http://127.0.0.1:PORT (import JSON on stdin)',
      );
    let input = '';
    if (command === 'import') {
      let bytes = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        bytes += chunk.length;
        if (bytes > MAX_IMPORT_BYTES) throw new Error('Import exceeds 10 MiB.');
        chunks.push(chunk);
      }
      input = Buffer.concat(chunks).toString('utf8');
    }
    console.log(JSON.stringify(await bridge(command, target, input), null, 2));
  } catch (error) {
    console.error(errorMessage(error));
    process.exitCode = 1;
  }
}
