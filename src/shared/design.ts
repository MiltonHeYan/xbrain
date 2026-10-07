import {isObject} from './types.js';

export const DOMAINS = ['web-ui', 'app-ui', 'interior', 'graphic', 'other'] as const;
export const FEATURE_KINDS = [
  'layout',
  'spacing',
  'typography',
  'color',
  'material',
  'shape',
] as const;
export interface DesignAnalysis {
  status: 'unanalyzed' | 'analyzed' | 'stale';
  images: {url: string; observed: boolean}[];
  domains: {label: string; featureIds: string[]}[];
  features: {id: string; kind: string; value: string; imageUrl: string; evidence: string}[];
  styles: {
    label: string;
    featureIds: string[];
    confidence: 'low' | 'medium' | 'high';
    confirmation: string | null;
  }[];
  analyzedAt: string | null;
  reason: string;
}
const text = (v: unknown, max = 2000): string => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error('Invalid design text.');
  return v.trim();
};
export function imageUrl(v: unknown): string {
  const u = new URL(text(v, 4096));
  if (u.protocol !== 'https:' || u.username || u.password)
    throw new Error('Image URLs must be HTTPS without credentials.');
  return u.href;
}
const rows = (v: unknown, max: number): Record<string, unknown>[] => {
  if (!Array.isArray(v) || v.length > max || v.some((x) => !isObject(x)))
    throw new Error('Invalid design list.');
  return v as Record<string, unknown>[];
};
export function validateDesign(input: unknown): DesignAnalysis {
  if (!isObject(input) || !['unanalyzed', 'analyzed', 'stale'].includes(String(input.status)))
    throw new Error('Invalid design status.');
  const images = rows(input.images, 12).map((x) => {
    if (typeof x.observed !== 'boolean') throw new Error('Specify actual image observation.');
    return {url: imageUrl(x.url), observed: x.observed};
  });
  if (new Set(images.map((x) => x.url)).size !== images.length)
    throw new Error('Duplicate image URL.');
  const features = rows(input.features, 40).map((x) => {
    const url = imageUrl(x.imageUrl);
    if (
      !FEATURE_KINDS.includes(x.kind as (typeof FEATURE_KINDS)[number]) ||
      !images.some((i) => i.url === url && i.observed)
    )
      throw new Error('Features require an observed image and valid dimension.');
    return {
      id: text(x.id, 80),
      kind: String(x.kind),
      value: text(x.value, 200),
      imageUrl: url,
      evidence: text(x.evidence),
    };
  });
  const ids = new Set(features.map((x) => x.id));
  if (ids.size !== features.length) throw new Error('Duplicate feature ID.');
  const refs = (v: unknown) => {
    if (
      !Array.isArray(v) ||
      !v.length ||
      v.length > 40 ||
      v.some((x) => typeof x !== 'string' || !ids.has(x))
    )
      throw new Error('Labels require existing visual evidence.');
    return [...new Set(v)] as string[];
  };
  const domains = rows(input.domains, 5).map((x) => {
    if (!DOMAINS.includes(x.label as (typeof DOMAINS)[number]))
      throw new Error('Invalid design domain.');
    return {label: String(x.label), featureIds: refs(x.featureIds)};
  });
  const styles = rows(input.styles, 12).map((x) => {
    if (!['low', 'medium', 'high'].includes(String(x.confidence)))
      throw new Error('Invalid style confidence.');
    return {
      label: text(x.label, 200),
      featureIds: refs(x.featureIds),
      confidence: x.confidence as 'low' | 'medium' | 'high',
      confirmation: x.confirmation === null ? null : text(x.confirmation),
    };
  });
  if (
    new Set(domains.map((x) => x.label)).size !== domains.length ||
    new Set(styles.map((x) => x.label.toLowerCase())).size !== styles.length
  )
    throw new Error('Duplicate design label.');
  const status = input.status as DesignAnalysis['status'];
  let analyzedAt: string | null = null;
  if (input.analyzedAt !== null) {
    if (
      typeof input.analyzedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T/.test(input.analyzedAt) ||
      !Number.isFinite(Date.parse(input.analyzedAt))
    )
      throw new Error('Invalid analysis date.');
    analyzedAt = new Date(input.analyzedAt).toISOString();
  }
  if (status === 'analyzed' && (!features.length || !domains.length || !analyzedAt))
    throw new Error('Analysis requires observed features, a domain and date.');
  if (
    status === 'unanalyzed' &&
    (features.length ||
      domains.length ||
      styles.length ||
      analyzedAt ||
      images.some((x) => x.observed))
  )
    throw new Error('Unanalyzed images cannot carry visual guesses.');
  return {status, images, domains, features, styles, analyzedAt, reason: text(input.reason)};
}
export interface DesignFilters {
  domain?: string;
  feature?: string;
  style?: string;
}
export function matchesDesign(d: DesignAnalysis | undefined, filters: DesignFilters): boolean {
  if (!filters.domain && !filters.feature && !filters.style) return true;
  if (!d || d.status !== 'analyzed') return false;
  const includes = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase());
  return (
    (!filters.domain || d.domains.some((x) => x.label === filters.domain)) &&
    (!filters.feature ||
      d.features.some(
        (x) => includes(x.value, filters.feature!) || includes(x.kind, filters.feature!),
      )) &&
    (!filters.style || d.styles.some((x) => includes(x.label, filters.style!)))
  );
}

export function validateDesignFilters(filters: DesignFilters): DesignFilters {
  if (filters.domain && !DOMAINS.includes(filters.domain as (typeof DOMAINS)[number]))
    throw new Error('Unknown design domain.');
  if (
    Object.values(filters).some(
      (x) => x !== undefined && (typeof x !== 'string' || x.length > 2000),
    )
  )
    throw new Error('Invalid design filter.');
  return filters;
}
