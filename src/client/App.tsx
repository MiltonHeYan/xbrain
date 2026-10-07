import {BrandMark} from './BrandMark.js';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {Bookmark} from '../shared/types.js';
import {errorMessage} from '../shared/types.js';
import {demoBookmarks} from './demo.js';
import {LibraryRepository} from './repository.js';
import {filterBookmarks} from './selectors.js';
import {BookmarkCard} from './components/BookmarkCard.js';
import {DetailDialog} from './components/DetailDialog.js';

export function App({
  embedded = false,
  active = true,
  onCount,
}: {embedded?: boolean; active?: boolean; onCount?: (count: number) => void} = {}) {
  const repository = useRef(new LibraryRepository());
  const [items, setItems] = useState<Bookmark[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () => filterBookmarks(items, 'all', '', query, 'newest'),
    [items, query],
  );
  const activeBookmark = items.find((b) => b.id === selected);
  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await repository.current.load();
      setDemo(data.showSamples);
      setItems(data.showSamples ? structuredClone(demoBookmarks) : data.bookmarks);
    } catch (e) {
      setError(
        'Could not open your collection. ' + errorMessage(e) + ' Nothing has been overwritten.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!loading) onCount?.(filtered.length);
  }, [loading, filtered.length, onCount]);
  useEffect(() => {
    if (!active) return;
    function key(e: KeyboardEvent) {
      if (e.key === '/' && !(document.activeElement instanceof HTMLInputElement) && !selected) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [selected, active]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to collection
      </a>
      <div className="collection">
        {!embedded && (
          <header className="topbar">
            <a className="brand" href="/" aria-label="Xbrain home">
              <BrandMark /> Xbrain
            </a>
            <a href="/?view=graph">Reference graph</a>
            <span className="collection-count" id="result-count" aria-live="polite">
              {loading ? '' : `${filtered.length} bookmarks`}
            </span>
          </header>
        )}
        <main id="main">
          <label className="search">
            <span className="sr-only">Search bookmarks</span>
            <input
              ref={searchRef}
              id="search"
              type="search"
              placeholder="Search bookmarks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd aria-hidden="true">/</kbd>
          </label>
          {demo && <p className="sample-note">Sample collection · fictional bookmarks</p>}
          {error && (
            <div className="connection-notice" role="alert">
              <p>{error}</p>
              <button className="text-button" onClick={() => void load()}>
                Try again
              </button>
            </div>
          )}
          <section id="gallery" className="gallery" aria-label="Bookmarks">
            {loading ? (
              <div className="empty">
                <h1>Opening your collection…</h1>
              </div>
            ) : error ? null : filtered.length ? (
              filtered.map((b) => (
                <BookmarkCard key={b.id} bookmark={b} onOpen={() => setSelected(b.id)} />
              ))
            ) : (
              <div className="empty">
                <h1>{items.length ? 'No bookmarks found.' : 'Your bookmarks, here.'}</h1>
                <p>
                  {items.length
                    ? 'Try another search.'
                    : 'Ask your agent to sync your X bookmarks with the Xbrain Skill. They’ll appear here.'}
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
      {active && activeBookmark && (
        <DetailDialog
          key={activeBookmark.id}
          bookmark={activeBookmark}
          demo={demo}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
