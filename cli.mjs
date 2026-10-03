#!/usr/bin/env node
import {readFile, writeFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {normalizeImport, normalizeLibrary, mergeBookmarks, MAX_IMPORT_BYTES, MAX_LIBRARY_BYTES} from './lib/bookmarks.mjs';
import {readStore, updateStore, DEFAULT_STORE} from './lib/store.mjs';

const args = process.argv.slice(2);
const command = args.shift();
const help = `xstash bookmark gallery

Usage:
  node cli.mjs import FILE [--store PATH]
  node cli.mjs restore BACKUP [--store PATH]
  node cli.mjs export [--store PATH] [--output FILE]
  node cli.mjs stats [--store PATH]

Import: partial JSON/X snapshot, up to 10 MiB and 10,000 records.
Restore: version 1 backup, up to 100 MiB and 50,000 records.
Both merge by ID, preserve local edits, and never delete missing records.
Export refuses to overwrite an existing file. Data stays on your computer.
`;
if (command === '--help' || command === '-h') {
  console.log(help);
  process.exit(0);
}
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${name}`);
  return args.splice(index, 2)[1];
}

try {
  const store = option('--store', DEFAULT_STORE);
  const output = option('--output', null);
  if (command === 'import' || command === 'restore') {
    if (args.length !== 1 || output) throw new Error(`Usage: node cli.mjs ${command} FILE [--store PATH]`);
    const limit = command === 'restore' ? MAX_LIBRARY_BYTES : MAX_IMPORT_BYTES;
    if ((await stat(args[0])).size > limit) throw new Error(`${command === 'restore' ? 'Backup' : 'Import'} exceeds ${limit / 1024 / 1024} MiB.`);
    const normalize = command === 'restore' ? normalizeLibrary : normalizeImport;
    const result = normalize(await readFile(args[0], 'utf8'));
    if (!result.bookmarks.length) throw new Error('No valid bookmarks found; collection unchanged.');
    let before;
    const data = await updateStore(store, old => {
      before = old.bookmarks.length;
      return {...old, bookmarks: mergeBookmarks(old.bookmarks, result.bookmarks), source: result.source};
    });
    console.log(JSON.stringify({imported: result.bookmarks.length, added: data.bookmarks.length - before, total: data.bookmarks.length, warnings: result.warnings}, null, 2));
  } else if (command === 'export') {
    if (args.length) throw new Error('Usage: node cli.mjs export [--store PATH] [--output FILE]');
    if (output && resolve(output) === resolve(store)) throw new Error('Export output must differ from the store.');
    const data = await readStore(store);
    const json = JSON.stringify({schemaVersion: 1, source: {provider: 'x', coverage: 'partial'}, bookmarks: data.bookmarks}, null, 2) + '\n';
    if (output) await writeFile(output, json, {mode: 0o600, flag: 'wx'});
    else process.stdout.write(json);
  } else if (command === 'stats') {
    if (args.length || output) throw new Error('Usage: node cli.mjs stats [--store PATH]');
    const {bookmarks} = await readStore(store);
    console.log(JSON.stringify({total: bookmarks.length, favorites: bookmarks.filter(bookmark => bookmark.favorite).length, tags: [...new Set(bookmarks.flatMap(bookmark => bookmark.tags || []))].length}, null, 2));
  } else {
    throw new Error('Usage: node cli.mjs <import FILE|restore FILE|export|stats> [--store PATH] [--output FILE]');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
