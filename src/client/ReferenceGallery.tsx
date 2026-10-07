import {useMemo, useState} from 'react';
import type {DesignGraph} from '../shared/design-graph.js';
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
  data: DesignGraph;
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
  const resources = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return data.resources.filter((r) =>
      terms.every((t) => [r.title, r.text, r.summary].join(' ').toLowerCase().includes(t)),
    );
  }, [data, query]);
  return (
    <main className="reference-gallery">
      <div className="reference-gallery-tools">
        <label>
          <span className="sr-only">Search references</span>
          <input
            type="search"
            placeholder="Search your bookmarks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
        {resources.length} of {data.total} bookmarks ·{' '}
        {data.resources.filter((r) => r.design?.images.length).length} with source images · Images
        load from their original source when enabled.
      </p>
      {data.truncated && (
        <p role="status">
          This shared overview shows the first {data.resources.length} of {data.total} records.
          Narrow the collection for more.
        </p>
      )}
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
      {!resources.length && <p>No references match this search.</p>}
    </main>
  );
}
