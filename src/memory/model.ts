import {canonicalSourceUrl} from '../shared/bookmarks.js';
import {createHash} from 'node:crypto';
import {validateDesign, matchesDesign, validateDesignFilters} from '../shared/design.js';
import type {DesignAnalysis, DesignFilters} from '../shared/design.js';
import {isObject} from '../shared/types.js';

export interface Resource {
  id: string;
  source: {provider: string; id: string; url: string};
  title: string;
  text: string;
  summary: string;
  purpose: string;
  useWhen: string[];
  limitations: string[];
  savedReason: string | null;
  updatedAt: string;
  design?: DesignAnalysis;
}
export interface SearchHit {
  resource: Resource;
  score: number;
  matched: string[];
  citation: {id: string; url: string; updatedAt: string};
}
export function digest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value ?? null))
    .digest('hex');
}
export function resourceId(provider: string, sourceId: string): string {
  return `resource_${digest([provider, sourceId])}`;
}
function string(value: unknown, name: string, max = 10000): string {
  if (typeof value !== 'string' || value.length > max)
    throw new Error(`Invalid ${name}; expected a string of at most ${max} characters.`);
  return value.trim();
}
function list(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length > 40) throw new Error(`Invalid ${name}.`);
  return [...new Set(value.map((item) => string(item, name, 2000)).filter(Boolean))];
}
export function timestamp(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error('Invalid updatedAt; use an ISO timestamp.');
  return new Date(value).toISOString();
}
export function validateResource(input: unknown): Resource {
  if (!isObject(input) || !isObject(input.source)) throw new Error('Invalid resource/source.');
  const provider = string(input.source.provider, 'source.provider', 64).toLowerCase();
  const sourceId = string(input.source.id, 'source.id', 512);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(provider) || !sourceId)
    throw new Error('A stable source provider and source ID are required.');
  const url = new URL(string(input.source.url, 'source.url', 4096));
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Source URLs must use HTTPS without embedded credentials.');
  const id = resourceId(provider, sourceId);
  if (input.id !== undefined && input.id !== id)
    throw new Error('Resource ID does not match its source.');
  return {
    id,
    source: {provider, id: sourceId, url: canonicalSourceUrl(provider, sourceId, url.href)},
    title: string(input.title, 'title', 500),
    text: string(input.text, 'text', 50000),
    summary: string(input.summary, 'summary'),
    purpose: string(input.purpose, 'purpose'),
    useWhen: list(input.useWhen, 'useWhen'),
    limitations: list(input.limitations, 'limitations'),
    savedReason: input.savedReason === null ? null : string(input.savedReason, 'savedReason'),
    updatedAt: timestamp(input.updatedAt),
    ...(input.design === undefined ? {} : {design: validateDesign(input.design)}),
  };
}
const stopwords = new Set(
  'a an the to for of in on and or is are be with use using my me i we our want need help please task resource resources find saved how can do this that it 做 一个 的 我 请 帮 帮我 如何 使用 资源 收藏 找 查找'.split(
    ' ',
  ),
);
function terms(value: string): string[] {
  const segments = new Intl.Segmenter(undefined, {granularity: 'word'}).segment(
    value.toLowerCase(),
  );
  return [
    ...new Set(
      [...segments]
        .filter((s) => s.isWordLike)
        .map((s) => s.segment)
        .filter((s) => !stopwords.has(s)),
    ),
  ];
}
/** Local lexical candidate retrieval; the Agent must assess applicability/limitations. */
export function searchResources(
  resources: Resource[],
  query: string,
  limit = 5,
  filters: DesignFilters = {},
): SearchHit[] {
  validateDesignFilters(filters);
  const words = terms(query);
  if (!words.length && !Object.values(filters).some(Boolean)) return [];
  return resources
    .filter((r) => matchesDesign(r.design, filters))
    .map((resource): SearchHit => {
      const fields = [
        [
          resource.design?.status === 'analyzed'
            ? [
                ...resource.design.features.map((x) => x.value),
                ...resource.design.styles.map((x) => x.label),
                ...resource.design.domains.map((x) => x.label),
              ].join(' ')
            : '',
          4,
        ],
        [resource.title, 4],
        [resource.purpose, 4],
        [resource.useWhen.join(' '), 4],
        [resource.summary, 2],
        [resource.text, 1],
      ].map(([text, weight]) => ({
        words: new Set(terms(text as string)),
        weight: weight as number,
      }));
      let score = 0;
      const matched = words.filter((word) => {
        let weight = 0;
        for (const field of fields) if (field.words.has(word)) weight += field.weight;
        score += weight;
        return weight > 0;
      });
      return {
        resource,
        score: !words.length ? 1 : matched.length / words.length >= 0.35 ? score : 0,
        matched,
        citation: {id: resource.id, url: resource.source.url, updatedAt: resource.updatedAt},
      };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.resource.id.localeCompare(b.resource.id))
    .slice(0, limit);
}
