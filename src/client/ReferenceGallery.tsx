import {readReferencePage} from './http.js';
import {useEffect, useState} from 'react';
import type {ReferencePage} from '../shared/design-graph.js';
function SourceImage({url, title}: {url: string; title: string}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className="reference-media-note">Image unavailable. Open the original post.</p>
  ) : (
    <img
      src={url}
      alt={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
export function ReferenceGallery({
  data,
  onGraph,
}: {
  data: ReferencePage;
  onGraph: (id: string) => void;
}) {
  const [query, setQuery] = useState(''),
    [images, setImages] = useState(() => {
      try {
        return localStorage.getItem('xbrain.source-images') !== 'off';
      } catch {
        return true;
      }
    });
  const [page, setPage] = useState(data),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!query.trim() && offset === 0) {
      setPage(data);
      setLoading(false);
      setError('');
      return;
    }
    const abort = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/references?q=${encodeURIComponent(query)}&offset=${offset}`, {signal: abort.signal})
      .then(readReferencePage)
      .then((result) => {
        if (abort.signal.aborted) return;
        const next = result;
        setPage((previous) =>
          offset ? {...next, resources: [...previous.resources, ...next.resources]} : next,
        );
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : 'Could not load references.');
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [data, query, offset]);
  const resources = page.resources;
  return (
    <main className="reference-gallery">
      <div className="reference-gallery-tools">
        <label>
          <span className="sr-only">Search references</span>
          <input
            type="search"
            placeholder="Search your bookmarks…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
            }}
          />
        </label>
        <label className="reference-image-choice">
          <input
            type="checkbox"
            checked={images}
            onChange={(e) => {
              setImages(e.target.checked);
              try {
                localStorage.setItem('xbrain.source-images', e.target.checked ? 'on' : 'off');
              } catch {
                /* Preview remains usable if storage is unavailable. */
              }
            }}
          />{' '}
          Show source images
        </label>
      </div>
      <p className="reference-gallery-note">
        {resources.length} of {page.matched} matches · {data.total} bookmarks · Images load from
        their original source when enabled.
      </p>
      {loading && <p role="status">Loading references…</p>}
      {error && <p role="alert">{error}</p>}
      <section className="reference-grid" aria-label="Saved references">
        {resources.map((r) => {
          const design = r.design;
          const image = design?.images[0];
          return (
            <article className="reference-card" key={r.id} data-resource-id={r.id}>
              <div className="reference-media">
                {image && images ? (
                  <SourceImage url={image.url} title={`Source preview for ${r.title}`} />
                ) : (
                  <div className="reference-media-note">
                    <span aria-hidden="true">▧</span>
                    <p>
                      {image
                        ? 'Source image available'
                        : design?.reason?.includes('no attached')
                          ? 'No attached image returned'
                          : 'Image URL not yet retrieved'}
                    </p>
                    {image && <small>Enable source images to preview</small>}
                  </div>
                )}
              </div>
              <div className="reference-card-body">
                <div className="reference-card-meta">
                  <span>{r.source.provider.toUpperCase()} · Bookmarks</span>
                  <span>
                    {design?.status === 'analyzed'
                      ? 'Image reviewed'
                      : design?.status === 'stale'
                        ? 'Review needed'
                        : 'Not analyzed'}
                  </span>
                </div>
                <h2>{r.title.replace(/https:\/\/t\.co\/\S+/g, '').trim()}</h2>
                <p>{r.summary || r.text}</p>
                <details>
                  <summary>Original text & media notes</summary>
                  <p>{r.text}</p>
                  <p>
                    {design?.reason ??
                      'Media has not been inspected. No visual labels have been assigned.'}
                  </p>
                  {design?.images.map((i) => (
                    <a key={i.url} href={i.url} target="_blank" rel="noreferrer">
                      Original image ↗{' '}
                    </a>
                  ))}
                </details>
                <div className="reference-card-actions">
                  <a href={r.source.url} target="_blank" rel="noreferrer">
                    Original post ↗
                  </a>
                  <button onClick={() => onGraph(r.id)}>View in Graph →</button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      {page.hasMore && (
        <button disabled={loading || !!error} onClick={() => setOffset(resources.length)}>
          Load more references
        </button>
      )}
      {!resources.length && <p>No references match this search.</p>}
    </main>
  );
}
