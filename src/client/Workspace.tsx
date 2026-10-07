import {apiUnavailable, readReferencePage} from './http.js';
import {useEffect, useState} from 'react';
import {App} from './App.js';
import {ReferenceGallery} from './ReferenceGallery.js';
import type {ReferencePage} from '../shared/design-graph.js';
import {DesignGraph} from './DesignGraph.js';
import {BrandMark} from './BrandMark.js';
import './workspace.css';
type View = 'gallery' | 'graph';
const currentView = (): View =>
  new URLSearchParams(window.location.search).get('view') === 'graph' ? 'graph' : 'gallery';
export function Workspace() {
  const [shared, setShared] = useState<ReferencePage | null>(null);
  const [sourceMode, setSourceMode] = useState<'loading' | 'memory' | 'legacy' | 'error'>(
    'loading',
  );
  const [sourceError, setSourceError] = useState('');
  const [focusId, setFocusId] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/references', {signal: abort.signal})
      .then(async (r) => {
        if (r.status === 409 || apiUnavailable(r)) {
          setSourceMode('legacy');
          return;
        }
        const d = await readReferencePage(r);
        setShared(d);
        setSourceMode('memory');
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setSourceError(e instanceof Error ? e.message : 'Could not load references.');
          setSourceMode('error');
        }
      });
    return () => abort.abort();
  }, []);
  const [view, setView] = useState<View>(currentView);
  const [visited, setVisited] = useState<Record<View, boolean>>(() => ({
    gallery: currentView() === 'gallery',
    graph: currentView() === 'graph',
  }));
  const [galleryCount, setGalleryCount] = useState<number | null>(null),
    [graphCount, setGraphCount] = useState<number | null>(null);
  useEffect(() => {
    const pop = () => {
      const next = currentView();
      setView(next);
      setVisited((v) => ({...v, [next]: true}));
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  function navigate(next: View) {
    if (next === view) return;
    if (next === 'gallery') setFocusId('');
    const url = new URL(window.location.href);
    if (next === 'graph') url.searchParams.set('view', 'graph');
    else url.searchParams.delete('view');
    window.history.pushState(null, '', url);
    setView(next);
    setVisited((v) => ({...v, [next]: true}));
  }
  const count = shared ? shared.total : view === 'gallery' ? galleryCount : graphCount;
  return (
    <div className="workspace">
      <header className="workspace-header">
        <div className="workspace-title">
          <BrandMark />
          <h1>Xbrain</h1>
        </div>
        <p>Your saved references, connected.</p>
      </header>
      <div className="workspace-navigation">
        <div role="tablist" aria-label="Collection views">
          {(['gallery', 'graph'] as const).map((name, index) => (
            <button
              key={name}
              id={`tab-${name}`}
              role="tab"
              aria-selected={view === name}
              aria-controls={`panel-${name}`}
              tabIndex={view === name ? 0 : -1}
              onClick={() => navigate(name)}
              onKeyDown={(e) => {
                let next: View | undefined;
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft')
                  next = index === 0 ? 'graph' : 'gallery';
                if (e.key === 'Home') next = 'gallery';
                if (e.key === 'End') next = 'graph';
                if (next) {
                  e.preventDefault();
                  navigate(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }
              }}
            >
              {name === 'gallery' ? 'Gallery' : 'Graph'}
            </button>
          ))}
        </div>
        <span className="workspace-count" aria-live="polite">
          {count === null
            ? 'Loading…'
            : `${count} ${shared ? 'bookmarks' : view === 'gallery' ? 'bookmarks' : 'references'}`}
        </span>
      </div>
      <div
        id="panel-gallery"
        role="tabpanel"
        aria-labelledby="tab-gallery"
        hidden={view !== 'gallery'}
      >
        {visited.gallery &&
          (shared ? (
            <ReferenceGallery
              data={shared}
              onGraph={(id) => {
                setFocusId(id);
                navigate('graph');
              }}
            />
          ) : sourceMode === 'legacy' ? (
            <App embedded active={view === 'gallery'} onCount={setGalleryCount} />
          ) : (
            <p role={sourceMode === 'error' ? 'alert' : 'status'}>
              {sourceError || 'Loading your references…'}
            </p>
          ))}
      </div>
      <div id="panel-graph" role="tabpanel" aria-labelledby="tab-graph" hidden={view !== 'graph'}>
        {visited.graph &&
          (sourceMode === 'memory' || sourceMode === 'legacy' ? (
            <DesignGraph embedded onCount={setGraphCount} focusId={focusId} />
          ) : (
            <p role={sourceMode === 'error' ? 'alert' : 'status'}>
              {sourceError || 'Loading your references…'}
            </p>
          ))}
      </div>
    </div>
  );
}
