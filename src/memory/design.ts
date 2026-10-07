import type {DesignAnalysis} from '../shared/design.js';
import type {Media} from '../shared/types.js';
import {isObject} from '../shared/types.js';
import {validateDesign} from '../shared/design.js';
import {digest, validateResource} from './model.js';
import {updateMemory} from './store.js';
import {applyResources} from './service.js';

/** No model or image download: the host Agent supplies actual observations. */
export async function analyzeResource(store: string, input: unknown) {
  if (
    !isObject(input) ||
    typeof input.id !== 'string' ||
    typeof input.resourceRevision !== 'string'
  )
    throw new Error('Analysis requires id and resourceRevision from the current resource.');
  const design = validateDesign(input.design);
  return updateMemory(store, (data) => {
    const old = data.resources.find((r) => r.id === input.id);
    if (!old || digest(old) !== input.resourceRevision)
      throw new Error('Stale analysis; re-read the resource and inspect its images.');
    const result = applyResources(data, [
      validateResource({
        ...old,
        design,
        updatedAt: new Date(Math.max(Date.now(), Date.parse(old.updatedAt) + 1)).toISOString(),
      }),
    ]);
    return {...result, analysis: design.status};
  });
}

/** Capture keeps supplied image URLs without pretending they have been viewed. */
export function capturedDesign(
  old: DesignAnalysis | undefined,
  media: Media[],
): DesignAnalysis | undefined {
  const urls = [
    ...new Set(
      media
        .filter((m) => m.type === 'image')
        .map((m) => m.url)
        .filter((url) => {
          try {
            const u = new URL(url);
            return u.protocol === 'https:' && !u.username && !u.password;
          } catch {
            return false;
          }
        }),
    ),
  ].slice(0, 12);
  if (!urls.length) return old;
  if (!old)
    return {
      status: 'unanalyzed',
      images: urls.map((url) => ({url, observed: false})),
      features: [],
      domains: [],
      styles: [],
      analyzedAt: null,
      reason: 'Captured source images have not been visually inspected.',
    };
  const added = urls.filter((url) => !old.images.some((i) => i.url === url));
  if (!added.length) return old;
  // Retain original evidence/image identities for audit; bounded additional pointers.
  return {
    ...old,
    status: old.status === 'unanalyzed' ? 'unanalyzed' : 'stale',
    images: [...old.images, ...added.map((url) => ({url, observed: false}))].slice(0, 12),
    reason: 'Source images changed; inspect the current originals before use.',
  };
}
