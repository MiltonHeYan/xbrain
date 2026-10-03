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
    .filter((b) => {
      // Legacy records can have the generated fallback but no sourceFields marker.
      // Exclude only that fallback; genuine source text and annotations stay searchable.
      const authorName =
        b.author.name === 'Unknown author' && !b.author.username ? '' : b.author.name;
      const searchable = [b.text, b.summary, authorName, b.author.username, ...b.tags, b.note]
        .join(' ')
        .toLowerCase();
      return words.every((word) => searchable.includes(word));
    })
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
