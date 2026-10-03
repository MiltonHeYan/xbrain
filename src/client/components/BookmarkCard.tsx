import {useState} from 'react';
import type {DemoBookmark, Media} from '../../shared/types.js';
import {safeUrl} from '../../shared/bookmarks.js';
import {date, title} from '../selectors.js';
export function MediaPreview({
  media,
  enabled,
  detail = false,
}: {
  media: Media;
  enabled: boolean;
  detail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!enabled)
    return (
      <div className={detail ? 'detail-media-placeholder' : 'card-art media-placeholder'}>
        <span aria-hidden="true">▧</span>
        <strong>Image kept private</strong>
        <small>External images are off</small>
      </div>
    );
  return (
    <div className={detail ? 'detail-media-wrap' : 'card-art'}>
      {failed ? (
        <span className="image-fallback">Image unavailable</span>
      ) : (
        <img
          className={detail ? 'detail-media' : undefined}
          loading={detail ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          src={safeUrl(media.url)}
          alt={media.alt || 'Saved post image'}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
export function BookmarkCard({
  bookmark: b,
  demo,
  externalImages,
  busy,
  onOpen,
  onFavorite,
}: {
  bookmark: DemoBookmark;
  demo: boolean;
  externalImages: boolean;
  busy: boolean;
  onOpen: () => void;
  onFavorite: () => void;
}) {
  const media = b.media.find((m) => m.type === 'image' && safeUrl(m.url));
  const art = demo ? b.demoArt : undefined;
  return (
    <article className={'card ' + (!media && !art ? 'no-art' : '')}>
      <button
        className="card-open"
        data-open={b.id}
        aria-label={'Read ' + title(b)}
        onClick={onOpen}
      >
        {art ? (
          <div className={'card-art text-art art-' + art.theme}>
            <span className="art-kicker">Notes from the sample collection</span>
            <strong style={{whiteSpace: 'pre-line'}}>{art.title}</strong>
            <small>XSTASH · DEMO</small>
          </div>
        ) : media ? (
          <MediaPreview key={media.url} media={media} enabled={externalImages} />
        ) : null}
        <div className="card-content">
          <div className="author">
            <span className="avatar">{b.author.name.slice(0, 1) || '?'}</span>
            <div className="author-info">
              <strong>{b.author.name || 'Unknown author'}</strong>
              <small>{b.author.username ? '@' + b.author.username : 'Saved from X'}</small>
            </div>
          </div>
          <h2>{title(b)}</h2>
          <p>{b.summary || b.text.split('\n').slice(1).join(' ') || b.text}</p>
          <div className="card-tags">
            {b.tags.slice(0, 3).map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
            {b.tags.length > 3 && <span className="tag">+{b.tags.length - 3}</span>}
            {!b.tags.length && <span className="tag">Untagged</span>}
          </div>
          <div className="card-foot">
            <span>
              {demo
                ? 'Sample post'
                : b.enrichment.kind === 'agent'
                  ? 'Agent enriched'
                  : b.summary
                    ? 'With summary'
                    : 'Saved post'}
            </span>
            <span>{date(b.savedAt)}</span>
          </div>
        </div>
      </button>
      <button
        className={'favorite ' + (b.favorite ? 'on' : '')}
        data-favorite={b.id}
        aria-label={(b.favorite ? 'Unfavorite ' : 'Favorite ') + title(b)}
        aria-pressed={!!b.favorite}
        disabled={busy}
        onClick={onFavorite}
      >
        {b.favorite ? '★' : '☆'}
      </button>
    </article>
  );
}
