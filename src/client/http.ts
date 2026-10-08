import type {ReferencePage} from '../shared/design-graph.js';
import {isObject} from '../shared/types.js';
/** Static hosts often answer missing API routes with the application's HTML shell. */
export function apiUnavailable(response: Response): boolean {
  const type = response.headers?.get('content-type')?.toLowerCase() ?? '';
  const json = type.includes('application/json') || type.includes('+json');
  return (response.status === 404 && !json) || (response.ok && type.includes('text/html'));
}
export async function readApiJson(response: Response): Promise<unknown> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('The local app returned an unreadable response. Nothing has been overwritten.');
  }
  if (!response.ok) {
    const error = data && typeof data === 'object' && 'error' in data ? data.error : undefined;
    throw new Error(
      typeof error === 'string' ? error : 'The local app could not complete this request.',
    );
  }
  return data;
}

export async function readReferencePage(response: Response): Promise<ReferencePage> {
  const data = await readApiJson(response);
  if (
    !isObject(data) ||
    !Array.isArray(data.resources) ||
    !Number.isSafeInteger(data.total) ||
    !Number.isSafeInteger(data.matched) ||
    !Number.isSafeInteger(data.offset) ||
    typeof data.hasMore !== 'boolean'
  )
    throw new Error('The local app returned an invalid reference collection.');
  return data as unknown as ReferencePage;
}
