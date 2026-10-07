import {readMemory} from '../memory/store.js';
import {searchResources} from '../memory/model.js';
import {matchesDesign, validateDesignFilters} from '../shared/design.js';
import {designGraph} from '../shared/design-graph.js';
import type {IncomingMessage, ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';
import {HttpError, errorMessage, errorCode} from '../shared/types.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {
  normalizeImport,
  normalizeLibrary,
  normalizeBookmarkPatch,
  mergeBookmarks,
  MAX_IMPORT_BYTES,
} from '../shared/bookmarks.js';
import {readStore, updateStore, DEFAULT_STORE} from './store.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const configuredPort = Number(process.env.PORT ?? 4317);
if (!Number.isInteger(configuredPort) || configuredPort < 0 || configuredPort > 65535) {
  console.error('PORT must be an integer between 0 and 65535.');
  process.exit(1);
}
const store = path.resolve(process.env.BOOKMARK_STORE || DEFAULT_STORE);
const json = (res: ServerResponse, status: number, data: unknown) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
};
async function body(req: IncomingMessage): Promise<unknown> {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_IMPORT_BYTES) {
      throw new HttpError('Import exceeds 10 MiB.', 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Invalid JSON.');
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
  try {
    const port = (server.address() as AddressInfo).port;
    const validHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
    if (!validHosts.has(req.headers.host ?? ''))
      return json(res, 403, {error: 'Only local host access is allowed.'});
    if (req.headers.origin) {
      // Validate a serialized origin, including scheme, rather than accepting any URL with a local host.
      const allowedOrigins = new Set([...validHosts].map((host) => `http://${host}`));
      if (!allowedOrigins.has(req.headers.origin))
        return json(res, 403, {error: 'Cross-origin access denied.'});
    }
    if (req.headers['sec-fetch-site'] === 'cross-site')
      return json(res, 403, {error: 'Cross-site access denied.'});
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith('/api/')) {
      if (
        req.method !== 'GET' &&
        req.method !== 'HEAD' &&
        req.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
      ) {
        return json(res, 415, {error: 'Expected application/json.'});
      }
      if (
        req.method === 'GET' &&
        (url.pathname === '/api/bookmarks' || url.pathname === '/api/export')
      ) {
        return json(res, 200, await readStore(store));
      }
      if (req.method === 'GET' && url.pathname === '/api/design') {
        if (!process.env.MEMORY_STORE)
          return json(res, 409, {
            error:
              'Start with MEMORY_STORE pointing to your selected resource memory file. The gallery library is separate.',
          });
        const query = url.searchParams.get('q') ?? '';
        const filters = {
          domain: url.searchParams.get('domain') || undefined,
          feature: url.searchParams.get('feature') || undefined,
          style: url.searchParams.get('style') || undefined,
        };
        if ([query, ...Object.values(filters)].some((x) => x && x.length > 2000))
          throw new Error('Search input is too long.');
        const data = await readMemory(path.resolve(process.env.MEMORY_STORE));
        validateDesignFilters(filters);
        const resources = query.trim()
          ? searchResources(data.resources, query, 10000, filters).map((x) => x.resource)
          : data.resources.filter((r) => matchesDesign(r.design, filters));
        return json(res, 200, designGraph(resources));
      }
      if (req.method === 'POST' && url.pathname === '/api/import') {
        const input = await body(req);
        const {bookmarks, warnings, source} = normalizeImport(input);
        if (!bookmarks.length)
          return json(res, 400, {error: 'No valid bookmarks found; collection unchanged.'});
        const next = await updateStore(store, (current) => ({
          ...current,
          source,
          bookmarks: mergeBookmarks(normalizeLibrary(current).bookmarks, bookmarks),
        }));
        return json(res, 200, {...next, warnings});
      }
      if (req.method === 'PUT' && url.pathname.startsWith('/api/bookmarks/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/bookmarks/'.length));
        const patch = normalizeBookmarkPatch(await body(req));
        let result;
        await updateStore(store, (current) => {
          const bookmark = current.bookmarks.find((bookmark) => bookmark.id === id);
          if (!bookmark) {
            throw new HttpError('Bookmark not found.', 404);
          }
          Object.assign(bookmark, patch);
          result = bookmark;
          return current;
        });
        return json(res, 200, {bookmark: result});
      }
      return json(res, 404, {error: 'API route not found.'});
    }
    if (req.method !== 'GET' && req.method !== 'HEAD')
      return json(res, 405, {error: 'Method not allowed.'});
    let file;
    if (url.pathname === '/lib/bookmarks.mjs' || url.pathname === '/lib/types.js') {
      file = path.join(
        root,
        'dist/lib',
        url.pathname === '/lib/bookmarks.mjs' ? 'bookmarks.mjs' : 'types.js',
      );
    } else {
      const pathname = decodeURIComponent(url.pathname);
      const name = pathname === '/' ? 'index.html' : pathname.slice(1);
      file = path.resolve(root, 'dist', name);
      if (!file.startsWith(path.join(root, 'dist') + path.sep))
        return json(res, 403, {error: 'Forbidden.'});
    }
    const data = await readFile(file);
    const mime: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.mjs': 'text/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
    };
    const contentType = mime[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type': contentType, 'Cache-Control': 'no-cache'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(errorCode(error) ?? ''))
      return json(res, 404, {error: 'Not found.'});
    json(res, error instanceof HttpError ? error.status : 400, {error: errorMessage(error)});
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.on('error', (error) => {
  console.error(`Could not start Xbrain: ${errorCode(error) || errorMessage(error)}`);
  process.exitCode = 1;
});
server.listen(configuredPort, '127.0.0.1', () =>
  console.log(
    `Xbrain ready at http://127.0.0.1:${(server.address() as AddressInfo).port}\nLocal datastore: ${store}`,
  ),
);
