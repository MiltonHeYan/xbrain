import {useEffect, useMemo, useRef, useState} from 'react';
import type {Bookmark, BookmarkPatch, DemoBookmark, Sort, View} from '../shared/types.js';
import {errorMessage} from '../shared/types.js';
import {normalizeBookmarkPatch} from '../shared/bookmarks.js';
import {demoBookmarks} from './demo.js';
import {LibraryRepository, exportLibrary} from './repository.js';
import {filterBookmarks, topics} from './selectors.js';
import {BookmarkCard} from './components/BookmarkCard.js';
import {DetailDialog} from './components/DetailDialog.js';
import {ImportDialog} from './components/ImportDialog.js';
import {GuideDialog} from './components/GuideDialog.js';
import {Filters, viewNames} from './components/Filters.js';
import {Sidebar} from './components/Sidebar.js';
export function App() {
  const repository = useRef(new LibraryRepository());
  const [library, setLibrary] = useState<Bookmark[]>([]),
    [samples, setSamples] = useState<DemoBookmark[]>(() => structuredClone(demoBookmarks)),
    [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [local, setLocal] = useState(true);
  const [query, setQuery] = useState(''),
    [topic, setTopic] = useState(''),
    [view, setView] = useState<View>('all'),
    [sort, setSort] = useState<Sort>('newest'),
    [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [externalImages, setExternalImages] = useState(false),
    [dialog, setDialog] = useState<'import' | 'guide' | null>(null),
    [guideBack, setGuideBack] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState(''),
    [warnings, setWarnings] = useState<string[]>([]),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null),
    libraryRef = useRef(library);
  libraryRef.current = library;
  const disabled = loading || !!error,
    items = demo ? samples : library;
  const topicCounts = useMemo(() => topics(items), [items]);
  const filtered = useMemo(
    () => filterBookmarks(items, view, topic, query, sort),
    [items, view, topic, query, sort],
  );
  const active = items.find((b) => b.id === selected);
  function clearFilters() {
    setQuery('');
    setTopic('');
    setView('all');
  }
  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await repository.current.load();
      setLibrary(data.bookmarks);
      setDemo(data.showSamples);
      setLocal(repository.current.mode === 'server');
    } catch (e) {
      setError(
        'Could not open your saved collection. ' +
          errorMessage(e) +
          ' Nothing has been overwritten.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement) &&
        !(document.activeElement instanceof HTMLSelectElement) &&
        !dialog &&
        !selected
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [dialog, selected]);
  async function update(id: string, patch: BookmarkPatch) {
    if (disabled) throw new Error('The collection is unavailable.');
    if (demo) {
      const valid = normalizeBookmarkPatch(patch);
      setSamples((prev) => prev.map((b) => (b.id === id ? {...b, ...valid} : b)));
      return;
    }
    const next = await repository.current.update(id, patch, libraryRef.current);
    setLibrary((prev) => prev.map((b) => (b.id === id ? next : b)));
  }
  async function favorite(b: Bookmark) {
    if (busy.has(b.id)) return;
    setBusy((prev) => new Set(prev).add(b.id));
    try {
      await update(b.id, {favorite: !b.favorite});
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(b.id);
        return next;
      });
    }
  }
  async function importDraft() {
    const before = library.length;
    const result = await repository.current.import(draft, libraryRef.current);
    setLibrary(result.bookmarks);
    setDemo(false);
    setDraft('');
    clearFilters();
    setWarnings(result.warnings);
    setMessage(`${result.bookmarks.length - before} added · Collection saved.`);
  }
  function exportAll() {
    try {
      exportLibrary(items, demo);
      setMessage(
        demo
          ? 'Sample export downloaded. It contains fictional bookmarks only.'
          : 'Export downloaded. Keep a copy somewhere safe.',
      );
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  function chooseView(next: View) {
    setView(next);
    setTopic('');
  }
  function chooseTopic(next: string) {
    setTopic(next);
    setView('all');
  }
  function guide(fromImport = false) {
    setGuideBack(fromImport);
    setDialog('guide');
  }
  return (
    <>
      <a className="skip" href="#main">
        Skip to collection
      </a>
      <Sidebar
        view={view}
        topic={topic}
        counts={{
          all: items.length,
          favorites: items.filter((b) => b.favorite).length,
          untagged: items.filter((b) => !b.tags.length).length,
        }}
        topics={topicCounts}
        onView={chooseView}
        onTopic={chooseTopic}
        onGuide={() => guide()}
        onExport={exportAll}
        disabled={disabled}
        local={local}
      />
      <div className="shell">
        <header className="topbar">
          <div className="breadcrumb">
            Your workspace <span>/</span>
            <strong>Library</strong>
          </div>
          <div className="top-actions">
            <span id="mode-label" className="demo-pill">
              {error
                ? 'LIBRARY UNAVAILABLE'
                : demo
                  ? 'DEMO COLLECTION'
                  : local
                    ? 'LOCAL LIBRARY'
                    : 'BROWSER LIBRARY'}
            </span>
            <button
              id="help"
              className="icon-button"
              aria-label="About this gallery"
              onClick={() => guide()}
            >
              ?
            </button>
          </div>
        </header>
        <main id="main">
          <div className="title-row">
            <div>
              <div className="title-eyebrow">YOUR COLLECTION</div>
              <h1>
                {topic || viewNames[view]}
                <span>.</span>
              </h1>
              <p id="page-description">Good ideas, kept close.</p>
            </div>
            <button
              id="open-import"
              className="primary"
              disabled={disabled}
              onClick={() => setDialog('import')}
            >
              <span>+</span>Import bookmarks
            </button>
          </div>
          {error && (
            <div className="connection-notice" role="alert">
              <p>{error}</p>
              <button className="secondary" onClick={() => void load()}>
                Try again
              </button>
            </div>
          )}
          <Filters
            query={query}
            setQuery={setQuery}
            sort={sort}
            setSort={setSort}
            view={view}
            setView={chooseView}
            topic={topic}
            setTopic={chooseTopic}
            topics={topicCounts}
            layout={layout}
            setLayout={setLayout}
            count={filtered.length}
            onExport={exportAll}
            disabled={disabled}
            searchRef={searchRef}
          />
          {demo && (
            <div className="demo-notice">
              You’re exploring a sample collection.{' '}
              <button onClick={() => setDialog('import')}>
                Import your bookmarks to make it yours.
              </button>
              <button
                id="return-library"
                onClick={() => {
                  setDemo(false);
                  clearFilters();
                }}
              >
                Back to your library
              </button>
            </div>
          )}
          {items.some((b) => b.media.some((m) => m.type === 'image')) && (
            <div className="media-settings">
              <label>
                <input
                  id="external-images"
                  type="checkbox"
                  checked={externalImages}
                  onChange={(e) => setExternalImages(e.target.checked)}
                />
                Show external images this session
              </label>
              <small>
                Images load from third-party hosts, which receive your IP address. Off by default.
              </small>
            </div>
          )}
          {!!warnings.length && (
            <details className="import-notices">
              <summary>Import notes · partial snapshot</summary>
              <ul>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
          <section
            id="gallery"
            className={'gallery ' + (layout === 'list' ? 'list' : '')}
            aria-label="Bookmarks"
          >
            {loading ? (
              <div className="empty">
                <h2>Opening your collection…</h2>
              </div>
            ) : error ? (
              <div className="empty">
                <h2>Your collection is safe.</h2>
                <p>Resolve the issue above, then try again.</p>
              </div>
            ) : filtered.length ? (
              filtered.map((b) => (
                <BookmarkCard
                  key={b.id}
                  bookmark={b}
                  demo={demo}
                  externalImages={externalImages}
                  busy={busy.has(b.id)}
                  onOpen={() => setSelected(b.id)}
                  onFavorite={() => void favorite(b)}
                />
              ))
            ) : (
              <div className="empty">
                <span aria-hidden="true">◇</span>
                <h2>{items.length ? 'No bookmarks match yet.' : 'Your collection starts here.'}</h2>
                <p>
                  {items.length
                    ? 'Try a different search, or clear your filters.'
                    : 'Ask your agent for a bookmark export, then bring it home.'}
                </p>
                <button
                  id="empty-action"
                  className="secondary"
                  onClick={() => (items.length ? clearFilters() : setDialog('import'))}
                >
                  {items.length ? 'Clear filters' : 'Import bookmarks'}
                </button>
                {!items.length && (
                  <button
                    id="explore-demo"
                    className="text-button"
                    onClick={() => {
                      setSamples(structuredClone(demoBookmarks));
                      setDemo(true);
                      clearFilters();
                    }}
                  >
                    Explore the sample collection
                  </button>
                )}
              </div>
            )}
          </section>
          <footer className="collection-footer">
            <span>
              {demo
                ? 'Fictional samples. Real possibilities.'
                : local
                  ? 'Stored locally. Export anytime.'
                  : 'Stored in this browser. Export a backup to keep it safe.'}
            </span>
            <span>XSTASH ✳</span>
          </footer>
        </main>
      </div>
      {dialog === 'import' && (
        <ImportDialog
          draft={draft}
          setDraft={setDraft}
          onImport={importDraft}
          onClose={() => setDialog(null)}
          onGuide={() => guide(true)}
          local={local}
          demo={demo}
        />
      )}
      {dialog === 'guide' && (
        <GuideDialog
          onClose={() => setDialog(null)}
          onBack={guideBack ? () => setDialog('import') : undefined}
        />
      )}
      {active && (
        <DetailDialog
          key={active.id}
          bookmark={active}
          demo={demo}
          externalImages={externalImages}
          onClose={() => setSelected(null)}
          onSave={async (patch) => {
            await update(active.id, patch);
            setMessage(demo ? 'Sample updated for this session.' : 'Changes saved.');
          }}
        />
      )}
      <div id="toast" className={message ? 'show' : ''} role="status">
        {message}
      </div>
    </>
  );
}
