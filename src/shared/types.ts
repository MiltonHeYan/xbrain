/** JSON v1 remains stable across the JS → TypeScript migration. */
export interface Author {
  name: string;
  username: string;
}
export interface Media {
  url: string;
  type: 'image' | 'video';
  alt: string;
}
export type Enrichment =
  | {kind: 'none' | 'imported' | 'user'}
  | {
      kind: 'agent';
      agent: string;
      generatedAt: string;
      basis: string;
    };
export type SourceField = 'text' | 'url' | 'author' | 'media';
export interface Bookmark {
  id: string;
  text: string;
  author: Author;
  url: string;
  createdAt: string | null;
  savedAt: string;
  tags: string[];
  summary: string;
  media: Media[];
  enrichment: Enrichment;
  sourceFields?: Partial<Record<SourceField, boolean>>;
  note?: string;
  favorite?: boolean;
}
export interface Source {
  provider: 'x';
  coverage: 'partial';
  via?: string;
  demo?: boolean;
}
export interface Library {
  version: 1;
  bookmarks: Bookmark[];
  source?: Source;
}
export interface ImportResult {
  bookmarks: Bookmark[];
  warnings: string[];
  source: Source;
}
export type BookmarkPatch = Partial<Pick<Bookmark, 'tags' | 'summary' | 'note' | 'favorite'>> & {
  enrichment?: {kind: 'user'};
};
export interface DemoBookmark extends Bookmark {
  demoArt?: {theme: string; title: string};
}
export type View = 'all' | 'favorites' | 'untagged';
export type Sort = 'newest' | 'oldest' | 'author';
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed.';
}
export function errorCode(error: unknown): string | undefined {
  return isObject(error) && typeof error.code === 'string' ? error.code : undefined;
}
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
