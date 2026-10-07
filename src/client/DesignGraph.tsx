import {useEffect, useMemo, useState} from 'react';
import {DOMAINS} from '../shared/design.js';
import type {DesignGraph as GraphData} from '../shared/design-graph.js';
import './design-graph.css';

function OriginalImage({url, title}: {url: string; title: string}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p>
      Image unavailable. Open the original source to check access; this preview cannot recover it.
    </p>
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

export function DesignGraph() {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [kind, setKind] = useState('all');
  const [selected, setSelected] = useState('');
  const [zoom, setZoom] = useState(1);
  const [images, setImages] = useState(false);
  const [request, setRequest] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setData(null);
    setSelected('');
    setImages(false);
    fetch(`/api/design?${request}`, {signal: controller.signal})
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not read design memory.');
        setData(result as GraphData);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not read design memory.');
      });
    return () => controller.abort();
  }, [request]);
  const nodes = useMemo(
    () =>
      data?.nodes.filter((n) => kind === 'all' || n.type === 'resource' || n.type === kind) ?? [],
    [data, kind],
  );
  const positions = useMemo(() => {
    const counts = [0, 0, 0];
    return new Map(
      nodes.map((n) => {
        const column = n.type === 'resource' ? 0 : n.type === 'style' ? 2 : 1;
        return [n.id, {x: 25 + column * 290, y: 45 + counts[column]!++ * 66}];
      }),
    );
  }, [nodes]);
  const edges = data?.edges.filter((e) => positions.has(e.source) && positions.has(e.target)) ?? [];
  const related = data?.edges.filter((e) => e.source === selected || e.target === selected) ?? [];
  const resourceIds = new Set([selected, ...related.map((e) => e.resourceId)]);
  const resources = data?.resources.filter((r) => resourceIds.has(r.id)) ?? [];
  const height = Math.max(420, ...[...positions.values()].map((p) => p.y + 70));
  const choose = (id: string) => {
    setSelected(id);
    setImages(false);
  };
  return (
    <main className="design-page">
      <header className="design-header">
        <a href="/">xrecall</a>
        <a href="/">Collection</a>
      </header>
      <p className="design-eyebrow">YOUR REFERENCES, CONNECTED</p>
      <h1>Find the thread.</h1>
      <p>
        Explore the visual details behind your saved references. A shared style is a hypothesis, not
        your preference.
      </p>
      <form
        className="design-controls"
        onSubmit={(e) => {
          e.preventDefault();
          setRequest(new URLSearchParams({q: query, domain}).toString());
        }}
      >
        <label>
          Task or feature
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Generous spacing, warm wood…"
          />
        </label>
        <label>
          Design domain
          <select value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">All domains</option>
            {DOMAINS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <button type="submit">Search</button>
      </form>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">Loading design memory…</p>
      ) : (
        <>
          <div className="design-toolbar">
            <label>
              Connections
              <select
                aria-label="Connection type"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setSelected('');
                }}
              >
                <option value="all">All</option>
                <option value="domain">Domains</option>
                <option value="feature">Features</option>
                <option value="style">Styles</option>
              </select>
            </label>
            <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} aria-label="Zoom out">
              −
            </button>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.2))} aria-label="Zoom in">
              +
            </button>
            <button onClick={() => setZoom(1)}>Reset zoom</button>
            <span>
              {data.resources.length} / {data.total} references · dashed = hypothesis
            </span>
          </div>
          {data.truncated && (
            <p role="status">
              Showing a bounded graph (30 references / 120 nodes). Narrow the search to explore
              more.
            </p>
          )}
          {!nodes.length ? (
            <p>No references found. Try another domain or task.</p>
          ) : (
            <div className="design-workspace">
              <section
                className="design-canvas"
                aria-label="Relationship graph. Scroll to pan, Tab to select nodes."
                tabIndex={0}
              >
                <svg
                  width={900 * zoom}
                  height={height * zoom}
                  viewBox={`0 0 900 ${height}`}
                  role="group"
                  aria-label="Resources connected to visual features and styles"
                >
                  <text x="25" y="22">
                    REFERENCES
                  </text>
                  <text x="315" y="22">
                    DOMAINS / FEATURES
                  </text>
                  <text x="605" y="22">
                    STYLE HYPOTHESES
                  </text>
                  {edges.map((e, i) => {
                    const a = positions.get(e.source)!,
                      b = positions.get(e.target)!;
                    return (
                      <path
                        key={i}
                        d={`M${a.x + 230},${a.y + 20} C${a.x + 265},${a.y + 20} ${b.x - 30},${b.y + 20} ${b.x},${b.y + 20}`}
                        fill="none"
                        stroke="black"
                        strokeWidth={e.source === selected || e.target === selected ? 2 : 0.7}
                        strokeDasharray={e.hypothesis ? '5 5' : undefined}
                      />
                    );
                  })}
                  {nodes.map((n) => {
                    const p = positions.get(n.id)!;
                    return (
                      <g
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${n.type}: ${n.label}`}
                        aria-pressed={selected === n.id}
                        onClick={() => choose(n.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            choose(n.id);
                          }
                          if (e.key === 'Escape') setSelected('');
                        }}
                        className="design-node"
                      >
                        <title>{n.label}</title>
                        <rect
                          x={p.x}
                          y={p.y}
                          width="230"
                          height="42"
                          rx={n.type === 'resource' ? 0 : 20}
                          fill={selected === n.id ? 'black' : 'white'}
                          stroke="black"
                        />
                        <text
                          x={p.x + 12}
                          y={p.y + 26}
                          fill={selected === n.id ? 'white' : 'black'}
                        >
                          {n.label.length > 28 ? n.label.slice(0, 27) + '…' : n.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </section>
              <aside className="design-detail" aria-label="Selected evidence" aria-live="polite">
                <h2>{data.nodes.find((n) => n.id === selected)?.label || 'Follow a connection'}</h2>
                {!selected && (
                  <p>Select a reference, feature or style to inspect its sources and reasoning.</p>
                )}
                {selected && (
                  <label className="design-image-toggle">
                    <input
                      type="checkbox"
                      checked={images}
                      onChange={(e) => setImages(e.target.checked)}
                    />{' '}
                    Load original images for this selection (contacts source hosts)
                  </label>
                )}
                {resources.map((r) => (
                  <article key={r.id}>
                    <h3>{r.title}</h3>
                    <a href={r.source.url} target="_blank" rel="noreferrer">
                      Original post
                    </a>
                    <p>
                      {r.design?.status ?? 'unanalyzed'} ·{' '}
                      {r.design?.reason ?? 'No visual analysis yet.'}
                    </p>
                    {r.design?.images.map((i) => (
                      <div key={i.url}>
                        <a href={i.url} target="_blank" rel="noreferrer">
                          Original image
                        </a>
                        {images && <OriginalImage url={i.url} title={r.title} />}
                      </div>
                    ))}
                    {related
                      .filter((e) => e.resourceId === r.id)
                      .map((e, i) => (
                        <div key={i} className="design-evidence">
                          <strong>{data.nodes.find((n) => n.id === e.target)?.label}</strong>
                          <p>
                            {e.hypothesis
                              ? `Hypothesis · ${e.confidence} confidence`
                              : e.confirmation
                                ? `User-confirmed label: ${e.confirmation}`
                                : 'Observed feature / evidence-based domain'}
                          </p>
                          <ul>
                            {e.evidence.map((v, j) => (
                              <li key={j}>{v}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </article>
                ))}
                {selected && (
                  <p>
                    Compare references with the user before translating shared features into design
                    requirements.
                  </p>
                )}
              </aside>
            </div>
          )}
        </>
      )}
    </main>
  );
}
