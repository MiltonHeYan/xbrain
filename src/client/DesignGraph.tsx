import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DOMAINS} from '../shared/design.js';
import type {DesignGraph as GraphData, GraphNode} from '../shared/design-graph.js';
import {NetworkCanvas, COLORS} from './graph/NetworkCanvas.js';
import type {NetworkControls} from './graph/NetworkCanvas.js';
import './design-graph.css';
import {BrandMark} from './BrandMark.js';

function OriginalImage({url, title}: {url: string; title: string}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p>Image unavailable. Open the original source to check access.</p>
  ) : (
    <img
      src={url}
      alt={`Source image for ${title}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
const NAMES: Record<GraphNode['type'], string> = {
  resource: 'References',
  domain: 'Domains',
  feature: 'Visual features',
  style: 'Style hypotheses',
};
export function DesignGraph({
  embedded = false,
  onCount,
  providedData,
  focusId,
}: {
  embedded?: boolean;
  onCount?: (count: number) => void;
  providedData?: GraphData;
  focusId?: string;
} = {}) {
  const [data, setData] = useState<GraphData | null>(providedData ?? null),
    [error, setError] = useState('');
  const [query, setQuery] = useState(''),
    [domain, setDomain] = useState(''),
    [kind, setKind] = useState('');
  const [selected, setSelected] = useState(''),
    [images, setImages] = useState(false),
    [browse, setBrowse] = useState(false);
  const controls = useRef<NetworkControls | null>(null),
    stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (providedData) {
      setData(providedData);
      return;
    }
    const abort = new AbortController();
    fetch('/api/design', {signal: abort.signal})
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || 'Could not load design memory.');
        setData(d);
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not load design memory.');
      });
    return () => abort.abort();
  }, [providedData]);
  useEffect(() => {
    if (data) onCount?.(data.total);
  }, [data, onCount]);
  const choose = useCallback((id: string) => {
    setSelected(id);
    setImages(false);
    setBrowse(false);
  }, []);
  useEffect(() => {
    if (focusId) {
      setQuery('');
      setDomain('');
      setKind('');
      choose(focusId);
    }
  }, [focusId, choose]);
  const matches = useMemo(() => {
    if (!data) return new Set<string>();
    const q = query.trim().toLowerCase();
    const resources = new Map(data.resources.map((r) => [r.id, r]));
    const eligible = new Set<string>();
    for (const r of data.resources)
      if (
        !domain ||
        (r.design?.status === 'analyzed' && r.design.domains.some((d) => d.label === domain))
      ) {
        eligible.add(r.id);
        for (const e of data.edges) if (e.resourceId === r.id) eligible.add(e.target);
      }
    return new Set(
      data.nodes
        .filter((n) => {
          const r = resources.get(n.id);
          const text = r
            ? [n.label, r.text, r.summary, ...(r.design?.features.map((f) => f.value) ?? [])].join(
                ' ',
              )
            : n.label;
          return (
            eligible.has(n.id) &&
            (!kind || n.type === kind) &&
            (!q || text.toLowerCase().includes(q))
          );
        })
        .map((n) => n.id),
    );
  }, [data, query, domain, kind]);
  const filtered = Boolean(query.trim() || domain || kind);
  const related = data?.edges.filter((e) => e.source === selected || e.target === selected) ?? [];
  const ids = new Set([selected, ...related.map((e) => e.resourceId)]);
  const resources = data?.resources.filter((r) => ids.has(r.id)) ?? [];
  const selectedNode = data?.nodes.find((n) => n.id === selected);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch {
      setError('Fullscreen is unavailable in this browser. The graph still works below.');
    }
  };
  return (
    <main className="design-page">
      {!embedded && (
        <>
          <header className="design-header">
            <a className="design-brand" href="/" aria-label="Xbrain home">
              <BrandMark />
              <span>Xbrain</span>
            </a>
            <div className="design-header-right">
              <span className="local-indicator">Local collection</span>
              <a href="/">View collection ↗</a>
            </div>
          </header>
          <div className="design-intro">
            <div>
              <p className="design-eyebrow">A PLACE FOR YOUR IDEAS</p>
              <h1>A clearer picture.</h1>
            </div>
            <p>
              Your references, connected.
              <br />
              Follow a detail. Find your next direction.
            </p>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {!data ? (
        <p role="status">Loading design memory…</p>
      ) : (
        <>
          <div className="design-stats">
            <span>
              {data.resources.length} references <span aria-hidden="true">/</span>{' '}
              {data.nodes.length} nodes <span aria-hidden="true">/</span> {data.edges.length}{' '}
              connections
            </span>
            <span>
              {data.resources.filter((r) => r.design?.status === 'analyzed').length} analyzed ·{' '}
              {data.resources.filter((r) => r.design?.status !== 'analyzed').length} awaiting image
              review
            </span>
          </div>
          {data.truncated && (
            <p role="status">
              This overview is limited to 100 references / 300 nodes. Not all records are shown.
            </p>
          )}
          <div className={`network-stage${selectedNode ? ' has-selection' : ''}`} ref={stage}>
            <NetworkCanvas
              data={data}
              selected={selected}
              highlight={filtered ? matches : null}
              onSelect={choose}
              controls={controls}
            />
            <div className="network-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search references and features"
                placeholder="Search references, features, styles…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              <select
                aria-label="Design domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                <option value="">All domains</option>
                {DOMAINS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="network-topline">
              <span>{filtered ? `${matches.size} matching nodes` : 'Explore the connections'}</span>
              <button onClick={() => setBrowse(!browse)} aria-expanded={browse}>
                Browse nodes
              </button>
              {filtered && (
                <button
                  onClick={() => {
                    setQuery('');
                    setDomain('');
                    setKind('');
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
            {browse && (
              <div className="network-node-list" aria-label="Browse graph nodes">
                {data.nodes
                  .filter((n) => !filtered || matches.has(n.id))
                  .map((n) => (
                    <button key={n.id} onClick={() => choose(n.id)}>
                      <span style={{background: COLORS[n.type]}} />
                      {n.type}: {n.label}
                    </button>
                  ))}
                {filtered && !matches.size && <p>No matching nodes.</p>}
              </div>
            )}
            {selectedNode && (
              <aside className="design-detail" aria-label="Selected evidence">
                <button
                  className="detail-close"
                  aria-label="Close evidence"
                  onClick={() => choose('')}
                >
                  ×
                </button>
                <p className="detail-kind">
                  {NAMES[selectedNode.type]} · {related.length} connections
                </p>
                <h2>{selectedNode.label.replace(/https:\/\/t\.co\/\S+/g, '').trim()}</h2>
                {resources.length > 0 && (
                  <label className="design-image-toggle">
                    <input
                      type="checkbox"
                      checked={images}
                      onChange={(e) => setImages(e.target.checked)}
                    />{' '}
                    Show original images (loads from source)
                  </label>
                )}
                {resources.map((r) => (
                  <article key={r.id}>
                    <h3>{r.title.replace(/https:\/\/t\.co\/\S+/g, '').trim()}</h3>
                    <a href={r.source.url} target="_blank" rel="noreferrer">
                      Original post ↗
                    </a>
                    <p className="reference-summary">{r.summary}</p>
                    <details className="observation-notes">
                      <summary>
                        {r.design?.status === 'analyzed'
                          ? 'Image reviewed'
                          : 'Awaiting image review'}{' '}
                        · Observation notes
                      </summary>
                      <p>{r.design?.reason ?? 'No visual analysis yet.'}</p>
                    </details>
                    {r.design?.images.map((i) => (
                      <div key={i.url}>
                        <a href={i.url} target="_blank" rel="noreferrer">
                          Original image ↗
                        </a>
                        {images && <OriginalImage url={i.url} title={r.title} />}
                      </div>
                    ))}
                    {related
                      .filter((e) => e.resourceId === r.id)
                      .map((e, i) => (
                        <div className="design-evidence" key={i}>
                          <strong>{data.nodes.find((n) => n.id === e.target)?.label}</strong>
                          <p>
                            {e.hypothesis
                              ? `Hypothesis · ${e.confidence} confidence`
                              : 'Observed evidence'}
                            {e.confirmation ? ` · ${e.confirmation}` : ''}
                          </p>
                          {e.evidence.map((t, j) => (
                            <p key={j}>{t}</p>
                          ))}
                        </div>
                      ))}
                  </article>
                ))}
              </aside>
            )}
            <div className="network-bottom">
              <div className="network-legend" aria-label="Graph legend">
                {(Object.keys(NAMES) as GraphNode['type'][]).map((type) => (
                  <button
                    key={type}
                    aria-pressed={kind === type}
                    onClick={() => setKind(kind === type ? '' : type)}
                  >
                    <span
                      className="legend-swatch"
                      style={{color: COLORS[type]}}
                      aria-hidden="true"
                    />
                    {NAMES[type]} <small>{data.nodes.filter((n) => n.type === type).length}</small>
                  </button>
                ))}
              </div>
              <div className="network-tools">
                <button aria-label="Zoom out" onClick={() => controls.current?.zoom(1 / 1.2)}>
                  −
                </button>
                <button aria-label="Zoom in" onClick={() => controls.current?.zoom(1.2)}>
                  +
                </button>
                <button aria-label="Reset zoom to 100%" onClick={() => controls.current?.reset()}>
                  100%
                </button>
                <button aria-label="Fit graph to view" onClick={() => controls.current?.fit()}>
                  ⊡
                </button>
                <button aria-label="Toggle fullscreen" onClick={() => void fullscreen()}>
                  ⛶
                </button>
              </div>
            </div>
          </div>
          <footer className="design-caption">
            <span>Drag to explore · Scroll to zoom · Select a point for its evidence</span>
            <span>
              Dashed connections = unconfirmed style · Disconnected points = no visual analysis
            </span>
          </footer>
        </>
      )}
    </main>
  );
}
