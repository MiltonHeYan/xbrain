import {readFile, stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {isAbsolute} from 'node:path';
import {isObject} from '../shared/types.js';
import {SOURCE_PROTOCOL} from '../memory/source.js';

const exec = promisify(execFile);
const BOOKMARK_TOOL = 'twitter__get_my_bookmarks';
const MAX_SNAPSHOT_AGE_MS = 30 * 60 * 1000;
function failure(code: string): never {
  throw new Error(code);
}
export function toolData(result: unknown): unknown {
  if (!isObject(result) || result.isError === true) failure('access_denied');
  if (result.structuredContent !== undefined) return result.structuredContent;
  if (!Array.isArray(result.content)) failure('unavailable');
  const text = result.content.filter(
    (v): v is {type: string; text: string} =>
      isObject(v) && v.type === 'text' && typeof v.text === 'string',
  );
  if (text.length !== 1) failure('unavailable');
  try {
    return JSON.parse(text[0]!.text);
  } catch {
    return failure('unavailable');
  }
}
export function verifyPersonalAccount(accounts: unknown, requested: string): string {
  if (!Array.isArray(accounts)) failure('unavailable');
  const handle = requested.toLowerCase();
  const matches = accounts.filter(
    (a) =>
      isObject(a) &&
      a.connector === 'twitter' &&
      a.alias === requested &&
      typeof a.identity === 'string' &&
      a.identity.toLowerCase() === handle &&
      a.member_scope === true,
  );
  if (matches.length !== 1) failure('access_denied');
  return requested;
}
export function snapshotPage(
  snapshot: unknown,
  request: Record<string, unknown>,
  maxResults: number,
) {
  if (
    !isObject(snapshot) ||
    snapshot.format !== 'xstash.corespeed-snapshot.v1' ||
    typeof snapshot.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(snapshot.fetchedAt)) ||
    Date.now() - Date.parse(snapshot.fetchedAt) > MAX_SNAPSHOT_AGE_MS ||
    Date.parse(snapshot.fetchedAt) > Date.now() + 60000
  )
    failure('unavailable');
  if (snapshot.account !== request.account || typeof request.account !== 'string')
    failure('access_denied');
  verifyPersonalAccount(snapshot.accounts, request.account);
  const data = toolData(snapshot.result);
  if (
    !isObject(data) ||
    data.error ||
    data.errors ||
    (!Array.isArray(data.data) && !(isObject(data.meta) && data.meta.result_count === 0))
  )
    failure('unavailable');
  const rows = (data.data ?? []) as unknown[];
  if (rows.length > maxResults || rows.length > 100) failure('unavailable');
  const items = rows.map((row) => {
    if (
      !isObject(row) ||
      typeof row.id !== 'string' ||
      !/^[0-9]{1,30}$/.test(row.id) ||
      typeof row.text !== 'string' ||
      row.text.length > 50000
    )
      failure('unavailable');
    return {
      id: row.id,
      title: row.text.slice(0, 120),
      text: row.text,
      url: `https://x.com/i/web/status/${row.id}`,
      updatedAt: null,
    };
  });
  return {
    protocol: SOURCE_PROTOCOL,
    ok: true,
    provider: 'x',
    account: request.account,
    items,
    nextCursor: null,
    checkpoint: null,
    coverage: 'partial',
  };
}
async function cliSnapshot(cli: string, account: string, maxResults: number) {
  const invoke = async (args: string[]) => {
    try {
      const {stdout} = await exec(
        /\.[cm]?js$/.test(cli) ? process.execPath : cli,
        /\.[cm]?js$/.test(cli) ? [cli, ...args] : args,
        {timeout: 15000, maxBuffer: 1024 * 1024},
      );
      return JSON.parse(stdout) as unknown;
    } catch (error) {
      // No raw CLI output: auth and diagnostic text may contain sensitive information.
      if (isObject(error) && error.code === 3) failure('authorization_required');
      if (isObject(error) && (error.code === 1 || error.code === 4 || error.code === 6))
        failure('access_denied');
      return failure('unavailable');
    }
  };
  const accounts = toolData(await invoke(['mcp', 'call', 'manage__accounts_list', '{}', '--raw']));
  verifyPersonalAccount(accounts, account);
  const definition = await invoke(['mcp', 'get', BOOKMARK_TOOL, '--json']);
  if (
    !isObject(definition) ||
    definition.name !== BOOKMARK_TOOL ||
    !isObject(definition.inputSchema) ||
    !isObject(definition.inputSchema.properties) ||
    !isObject(definition.inputSchema.properties.account) ||
    !isObject(definition.inputSchema.properties.max_results) ||
    (Array.isArray(definition.inputSchema.required) &&
      definition.inputSchema.required.some(
        (key) => !['account', 'max_results'].includes(String(key)),
      ))
  )
    failure('unavailable');
  const result = await invoke([
    'mcp',
    'call',
    BOOKMARK_TOOL,
    JSON.stringify({account, max_results: maxResults}),
    '--raw',
  ]);
  return {
    format: 'xstash.corespeed-snapshot.v1',
    account,
    accounts,
    fetchedAt: new Date().toISOString(),
    result,
  };
}
export async function runCoreSpeedSource(args = process.argv.slice(2)) {
  let response: unknown;
  try {
    const options: Record<string, string> = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]!,
        value = args[i + 1];
      if (!['--snapshot', '--cli', '--max-results'].includes(key) || !value || options[key])
        failure('unavailable');
      options[key] = value;
    }
    if (Boolean(options['--snapshot']) === Boolean(options['--cli'])) failure('unavailable');
    const path = options['--snapshot'] ?? options['--cli']!;
    if (!isAbsolute(path)) failure('unavailable');
    const maxResults = Number(options['--max-results'] ?? 12);
    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100) failure('unavailable');
    let raw = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 16000) failure('unavailable');
    }
    const request: unknown = JSON.parse(raw);
    if (
      !isObject(request) ||
      request.protocol !== SOURCE_PROTOCOL ||
      request.operation !== 'fetch' ||
      request.provider !== 'x' ||
      typeof request.account !== 'string' ||
      !/^@[A-Za-z0-9_]{1,15}$/.test(request.account) ||
      request.cursor !== null ||
      request.checkpoint !== null
    )
      failure('access_denied');
    let snapshot: unknown;
    if (options['--snapshot']) {
      if ((await stat(path)).size > 1024 * 1024) failure('unavailable');
      snapshot = JSON.parse(await readFile(path, 'utf8'));
    } else snapshot = await cliSnapshot(path, request.account, maxResults);
    response = snapshotPage(snapshot, request, maxResults);
  } catch (error) {
    const code =
      error instanceof Error &&
      ['authorization_required', 'access_denied', 'unavailable'].includes(error.message)
        ? error.message
        : 'unavailable';
    response = {protocol: SOURCE_PROTOCOL, ok: false, code};
  }
  console.log(JSON.stringify(response));
}
