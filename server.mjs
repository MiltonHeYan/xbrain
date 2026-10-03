import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {normalizeImport, normalizeBookmarkPatch, mergeBookmarks, MAX_IMPORT_BYTES} from './lib/bookmarks.mjs';
import {readStore, updateStore, DEFAULT_STORE} from './lib/store.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const configuredPort = Number(process.env.PORT ?? 4317);
if (!Number.isInteger(configuredPort) || configuredPort < 0 || configuredPort > 65535) {
  console.error('PORT must be an integer between 0 and 65535.');
  process.exit(1);
}
const store = path.resolve(process.env.BOOKMARK_STORE || DEFAULT_STORE);
const json = (res, status, data) => {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(data));
};
async function body(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_IMPORT_BYTES) {
      const error = new Error('Import exceeds 10 MiB.');
      error.status = 413;
      throw error;
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
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  try {
    const port = server.address().port;
    const validHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
    if (!validHosts.has(req.headers.host)) return json(res, 403, {error: 'Only local host access is allowed.'});
    if (req.headers.origin) {
      // Validate a serialized origin, including scheme, rather than accepting any URL with a local host.
      const allowedOrigins = new Set([...validHosts].map(host => `http://${host}`));
      if (!allowedOrigins.has(req.headers.origin)) return json(res, 403, {error: 'Cross-origin access denied.'});
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') return json(res, 403, {error: 'Cross-site access denied.'});
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return json(res, 415, {error: 'Expected application/json.'});
      }
      if (req.method === 'GET' && (url.pathname === '/api/bookmarks' || url.pathname === '/api/export')) {
        return json(res, 200, await readStore(store));
      }
      if (req.method === 'POST' && url.pathname === '/api/import') {
        const input = await body(req);
        const {bookmarks, warnings, source} = normalizeImport(input);
        if (!bookmarks.length) return json(res, 400, {error: 'No valid bookmarks found; collection unchanged.'});
        const next = await updateStore(store, current => ({...current, source, bookmarks: mergeBookmarks(current.bookmarks, bookmarks)}));
        return json(res, 200, {...next, warnings});
      }
      if (req.method === 'PUT' && url.pathname.startsWith('/api/bookmarks/')) {
        const id = decodeURIComponent(url.pathname.slice('/api/bookmarks/'.length));
        const patch = normalizeBookmarkPatch(await body(req));
        let result;
        await updateStore(store, current => {
          const bookmark = current.bookmarks.find(bookmark => bookmark.id === id);
          if (!bookmark) {
            const error = new Error('Bookmark not found.');
            error.status = 404;
            throw error;
          }
          Object.assign(bookmark, patch);
          result = bookmark;
          return current;
        });
        return json(res, 200, {bookmark: result});
      }
      return json(res, 404, {error: 'API route not found.'});
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, {error: 'Method not allowed.'});
    let file;
    if (url.pathname === '/lib/bookmarks.mjs') {
      file = path.join(root, 'lib/bookmarks.mjs');
    } else {
      const pathname = decodeURIComponent(url.pathname);
      const name = pathname === '/' ? 'index.html' : pathname.slice(1);
      file = path.resolve(root, 'public', name);
      if (!file.startsWith(path.join(root, 'public') + path.sep)) return json(res, 403, {error: 'Forbidden.'});
    }
    const data = await readFile(file);
    const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml'}[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type': mime, 'Cache-Control': 'no-cache'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'EISDIR') return json(res, 404, {error: 'Not found.'});
    json(res, error.status || 400, {error: error.message || 'Request failed.'});
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.on('error', error => {
  console.error(`Could not start xstash: ${error.code || error.message}`);
  process.exitCode = 1;
});
server.listen(configuredPort, '127.0.0.1', () => console.log(`xstash ready at http://127.0.0.1:${server.address().port}\nLocal datastore: ${store}`));
