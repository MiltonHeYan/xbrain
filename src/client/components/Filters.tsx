import type {RefObject} from 'react';
import type {Sort, View} from '../../shared/types.js';
export const viewNames: Record<View, string> = {
  all: 'All bookmarks',
  favorites: 'Favorites',
  untagged: 'Untagged',
};
export function Filters({
  query,
  setQuery,
  sort,
  setSort,
  view,
  setView,
  topic,
  setTopic,
  topics,
  layout,
  setLayout,
  count,
  onExport,
  disabled,
  searchRef,
}: {
  query: string;
  setQuery: (q: string) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
  view: View;
  setView: (v: View) => void;
  topic: string;
  setTopic: (v: string) => void;
  topics: [string, number][];
  layout: 'grid' | 'list';
  setLayout: (v: 'grid' | 'list') => void;
  count: number;
  onExport: () => void;
  disabled: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <div className="mobile-library">
        <label className="sr-only" htmlFor="mobile-view">
          Collection view
        </label>
        <select id="mobile-view" value={view} onChange={(e) => setView(e.target.value as View)}>
          {Object.entries(viewNames).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <button className="secondary" id="mobile-export" disabled={disabled} onClick={onExport}>
          ⇩ Export
        </button>
      </div>
      <div className="toolbar">
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            id="search"
            type="search"
            aria-label="Search bookmarks"
            placeholder="Search ideas, people, or topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>/</kbd>
        </label>
        <select
          id="sort"
          aria-label="Sort bookmarks"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          <option value="newest">Recently saved</option>
          <option value="oldest">Oldest first</option>
          <option value="author">Author A–Z</option>
        </select>
        <div className="view-switch" aria-label="Layout">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              id={v + '-view'}
              className={layout === v ? 'selected' : ''}
              aria-label={v === 'grid' ? 'Grid view' : 'List view'}
              aria-pressed={layout === v}
              onClick={() => setLayout(v)}
            >
              {v === 'grid' ? '▦' : '☰'}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-row">
        <div id="chips">
          <button
            className={'chip ' + (!topic ? 'active' : '')}
            aria-pressed={!topic}
            onClick={() => setTopic('')}
          >
            All topics
          </button>
          {topics.slice(0, 6).map(([t]) => (
            <button
              key={t}
              className={'chip ' + (topic === t ? 'active' : '')}
              aria-pressed={topic === t}
              onClick={() => setTopic(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          id="topic-select"
          aria-label="Choose any topic"
          value={topic}
          hidden={topics.length < 7}
          onChange={(e) => setTopic(e.target.value)}
        >
          <option value="">All topics</option>
          {topics.map(([t, n]) => (
            <option key={t} value={t}>
              {t} ({n})
            </option>
          ))}
        </select>
        <span id="result-count" aria-live="polite">
          {count} bookmark{count === 1 ? '' : 's'}
        </span>
      </div>
    </>
  );
}
