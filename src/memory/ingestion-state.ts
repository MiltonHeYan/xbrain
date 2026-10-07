import {isObject} from '../shared/types.js';
import {timestamp} from './model.js';

export interface SourceProgress {
  generation: number;
  active: boolean;
  cursor: string | null;
  checkpoint: string | null;
  seen: string[];
  coverage: 'partial' | 'full';
}
export interface IngestionState {
  sources: Record<string, SourceProgress>;
  captures: Record<string, {revision: string; updatedAt: string | null; title?: string}>;
  pending: Record<string, {sourceKey: string; sourceRevision: string}>;
}
export const emptyIngestion = (): IngestionState => ({sources: {}, captures: {}, pending: {}});
export function opaque(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.length || value.length > 4096)
    throw new Error('Invalid source continuation/checkpoint.');
  return value;
}
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const id = (v: string) => /^resource_[a-f0-9]{64}$/.test(v);
export function validateIngestion(value: unknown): IngestionState {
  if (value === undefined) return emptyIngestion();
  if (
    !isObject(value) ||
    !isObject(value.sources) ||
    !isObject(value.captures) ||
    !isObject(value.pending)
  )
    throw new Error('Invalid ingestion state.');
  if (
    Object.keys(value.sources).length > 100 ||
    Object.keys(value.captures).length > 10000 ||
    Object.keys(value.pending).length > 10000
  )
    throw new Error('Ingestion state capacity exceeded.');
  const result = emptyIngestion();
  for (const [key, state] of Object.entries(value.sources)) {
    if (
      !hash(key) ||
      !isObject(state) ||
      typeof state.active !== 'boolean' ||
      !Array.isArray(state.seen) ||
      state.seen.length > 10000 ||
      !state.seen.every(hash) ||
      !['partial', 'full'].includes(String(state.coverage))
    )
      throw new Error('Invalid source progress.');
    const generation = state.generation ?? 0;
    if (!Number.isSafeInteger(generation) || (generation as number) < 0)
      throw new Error('Invalid source generation.');
    result.sources[key] = {
      generation: generation as number,
      active: state.active,
      cursor: opaque(state.cursor),
      checkpoint: opaque(state.checkpoint),
      seen: state.seen as string[],
      coverage: state.coverage as SourceProgress['coverage'],
    };
  }
  for (const [key, capture] of Object.entries(value.captures)) {
    if (!id(key) || !isObject(capture) || !hash(capture.revision))
      throw new Error('Invalid source capture.');
    if (
      capture.title !== undefined &&
      (typeof capture.title !== 'string' || capture.title.length > 500)
    )
      throw new Error('Invalid captured title.');
    result.captures[key] = {
      ...(typeof capture.title === 'string' ? {title: capture.title} : {}),
      revision: capture.revision,
      updatedAt: capture.updatedAt === null ? null : timestamp(capture.updatedAt),
    };
  }
  for (const [key, pending] of Object.entries(value.pending)) {
    if (!id(key) || !isObject(pending) || !hash(pending.sourceKey) || !hash(pending.sourceRevision))
      throw new Error('Invalid distillation queue.');
    result.pending[key] = {sourceKey: pending.sourceKey, sourceRevision: pending.sourceRevision};
  }
  return result;
}
