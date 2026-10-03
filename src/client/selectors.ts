import type {Bookmark, Sort, View} from '../shared/types.js';
export function topics(bookmarks: Bookmark[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const b of bookmarks) for (const tag of b.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
export function filterBookmarks<T extends Bookmark>(
  bookmarks: T[],
  view: View,
  topic: string,
  query: string,
  sort: Sort,
): T[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return bookmarks
    .filter(
      (b) =>
        (view !== 'favorites' || b.favorite) &&
        (view !== 'untagged' || !b.tags.length) &&
        (!topic || b.tags.includes(topic)),
    )
    .filter((b) =>
      words.every((word) =>
        [b.text, b.summary, b.author.name, b.author.username, ...b.tags, b.note]
          .join(' ')
          .toLowerCase()
          .includes(word),
      ),
    )
    .sort((a, b) =>
      sort === 'author'
        ? a.author.name.localeCompare(b.author.name)
        : sort === 'oldest'
          ? Date.parse(a.savedAt) - Date.parse(b.savedAt)
          : Date.parse(b.savedAt) - Date.parse(a.savedAt),
    );
}
export function title(b: Bookmark): string {
  const first = b.text.split('\n').find(Boolean) || b.summary || 'Saved bookmark';
  return first.length > 125 ? first.slice(0, 122) + '…' : first;
}
export function date(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(+parsed)
    ? 'Date unavailable'
    : parsed.toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
        year: parsed.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
}
