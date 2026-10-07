import {spawn} from 'node:child_process';
import {isAbsolute} from 'node:path';
import {isObject} from '../shared/types.js';

export function commandArguments(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 10 ||
    !value.every((s) => typeof s === 'string' && s.length < 4096) ||
    !isAbsolute(value[0])
  )
    throw new Error('Adapter command must name an absolute trusted executable.');
  return value as string[];
}
/** One request, no shell, bounded output; diagnostics never echo credentials or source text. */
export async function runCommand(
  command: string[],
  request: Record<string, unknown>,
  protocol: string,
  timeoutMs = 15000,
) {
  const raw = await new Promise<string>((resolve, reject) => {
    const child = spawn(command[0]!, command.slice(1), {stdio: ['pipe', 'pipe', 'pipe']});
    let output = '',
      bytes = 0,
      settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        child.kill();
        reject(error);
      } else resolve(output);
    };
    const timer = setTimeout(
      () => finish(new Error('Source adapter timed out; page not committed.')),
      timeoutMs,
    );
    child.once('error', () => finish(new Error('Source adapter could not start.')));
    child.stdin.on('error', () => finish(new Error('Source adapter closed its input.')));
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 1024 * 1024) finish(new Error('Source adapter response exceeds 1 MiB.'));
      else output += chunk;
    });
    child.stderr.resume();
    child.once('close', (code) =>
      finish(
        code === 0
          ? undefined
          : new Error('Source adapter failed; inspect its private diagnostics.'),
      ),
    );
    child.stdin.end(JSON.stringify({...request, protocol}) + '\n');
  });
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Source adapter returned invalid JSON.');
  }
  if (!isObject(data) || data.protocol !== protocol)
    throw new Error('Invalid source adapter protocol.');
  if (data.ok !== true) {
    const codes = [
      'authorization_required',
      'access_denied',
      'rate_limited',
      'cursor_expired',
      'unavailable',
    ];
    const code = typeof data.code === 'string' && codes.includes(data.code) ? data.code : 'failed';
    throw new Error(`Source fetch blocked: ${code}. No fallback source/account was selected.`);
  }
  return data;
}
