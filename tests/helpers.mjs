import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const cli = join(root, 'cli.mjs');
export const runCli = (args, cwd = root) => spawnSync(process.execPath, [cli, ...args], {cwd, encoding: 'utf8'});
export async function temporary(t, prefix = 'commonplace-test-') {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(dir, {recursive: true, force: true}));
  return dir;
}
export async function startServer(t, options = {}) {
  const dir = await temporary(t, 'commonplace-api-');
  const store = join(dir, 'bookmarks.json');
  const child = spawn(process.execPath, ['server.mjs'], {cwd: root, env: {...process.env, PORT: '0', BOOKMARK_STORE: store, ...options}});
  let output = '';
  let errors = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errors += chunk; });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server startup timed out: ${errors}`)), 5000);
    const fail = error => {clearTimeout(timer); reject(error);};
    child.once('error', fail);
    child.once('exit', code => fail(new Error(`Server exited ${code}: ${errors}`)));
    child.stdout.on('data', () => {
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {clearTimeout(timer); resolve(match[0]);}
    });
  });
  const request = async (path, body, method = 'POST', headers = {}) => {
    const response = await fetch(base + path, {method, headers: {'Content-Type': 'application/json', ...headers}, body: body === undefined ? undefined : JSON.stringify(body)});
    return {status: response.status, data: await response.json(), headers: response.headers};
  };
  assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/);
  return {base, store, dir, request};
}
export async function runCliAsync(args) {
  const child = spawn(process.execPath, [cli, ...args], {cwd: root});
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => {stdout += chunk;});
  child.stderr.on('data', chunk => {stderr += chunk;});
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', status => resolve({status, stdout, stderr}));
  });
}
