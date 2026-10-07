import {readFile, stat} from 'node:fs/promises';
import {isObject} from '../shared/types.js';
import {digest, timestamp, validateResource} from './model.js';
import {commandArguments, runCommand} from './command.js';
import {opaque} from './ingestion-state.js';

export interface SourceItem {
  id: string;
  url: string;
  title: string;
  text: string;
  updatedAt: string | null;
}
export interface SourcePage {
  items: SourceItem[];
  nextCursor: string | null;
  checkpoint: string | null;
  coverage: 'partial' | 'full';
}
export interface BookmarkSource {
  key: string;
  provider: string;
  pagination: 'cursor' | 'single';
  incremental: 'checkpoint' | 'rescan';
  fetch(cursor: string | null, checkpoint: string | null): Promise<SourcePage>;
}
export const SOURCE_PROTOCOL = 'xstash.source.v1';
export async function loadSource(path: string): Promise<BookmarkSource> {
  if ((await stat(path)).size > 16000) throw new Error('Source config exceeds 16 KiB.');
  let config: unknown;
  try {
    config = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new Error('Invalid source config JSON.');
  }
  if (
    !isObject(config) ||
    config.kind !== 'command' ||
    config.scope !== 'personal' ||
    typeof config.provider !== 'string' ||
    !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(config.provider) ||
    typeof config.account !== 'string' ||
    !config.account.trim() ||
    config.account.length > 200 ||
    !['cursor', 'single'].includes(String(config.pagination)) ||
    !['checkpoint', 'rescan'].includes(String(config.incremental))
  )
    throw new Error(
      'Select a personal source, account and real pagination/incremental capabilities explicitly.',
    );
  const timeoutMs = Number(config.timeoutMs ?? 15000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000)
    throw new Error('Source timeoutMs must be 1,000–60,000.');
  const command = commandArguments(config.command);
  const provider = config.provider,
    account = config.account;
  const pagination = config.pagination as BookmarkSource['pagination'];
  const incremental = config.incremental as BookmarkSource['incremental'];
  return {
    key: digest({command, provider, account, pagination, incremental, scope: 'personal'}),
    provider,
    pagination,
    incremental,
    async fetch(cursor, checkpoint) {
      const data = await runCommand(
        command,
        {operation: 'fetch', provider, account, cursor, checkpoint, limit: 100},
        SOURCE_PROTOCOL,
        timeoutMs,
      );
      if (data.provider !== provider || data.account !== account)
        throw new Error('Source/account mismatch; page not committed.');
      if (
        !Array.isArray(data.items) ||
        data.items.length > 100 ||
        !['partial', 'full'].includes(String(data.coverage))
      )
        throw new Error('Invalid source page.');
      const nextCursor = opaque(data.nextCursor),
        nextCheckpoint = opaque(data.checkpoint);
      if (pagination === 'single' && nextCursor !== null)
        throw new Error(
          'Source does not support pagination; do not invent continuation parameters.',
        );
      if (incremental === 'rescan' && nextCheckpoint !== null)
        throw new Error('Rescan source cannot return an incremental checkpoint.');
      if (nextCursor === null && incremental === 'checkpoint' && nextCheckpoint === null)
        throw new Error('Incremental source must confirm a checkpoint on its final page.');
      const items = data.items.map((item): SourceItem => {
        if (!isObject(item)) throw new Error('Invalid source item.');
        const validated = validateResource({
          source: {provider, id: item.id, url: item.url},
          title: item.title,
          text: item.text,
          summary: '',
          purpose: '',
          useWhen: [],
          limitations: [],
          savedReason: null,
          updatedAt: '2000-01-01T00:00:00Z',
        });
        return {
          id: validated.source.id,
          url: validated.source.url,
          title: validated.title,
          text: validated.text,
          updatedAt: item.updatedAt === null ? null : timestamp(item.updatedAt),
        };
      });
      return {
        items,
        nextCursor,
        checkpoint: nextCheckpoint,
        coverage: data.coverage as SourcePage['coverage'],
      };
    },
  };
}
