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
export function BookmarkCard({bookmark: b, onOpen}: {bookmark: DemoBookmark; onOpen: () => void}) {
  return (
    <article className="card">
      <button
        className="card-open"
        data-open={b.id}
        aria-label={'Read ' + title(b)}
        onClick={onOpen}
      >
        <div className="card-author">
          <span>{b.author.name || 'Unknown author'}</span>
          <time>{date(b.savedAt)}</time>
        </div>
        <h2>{title(b)}</h2>
        <p>{b.summary || b.text.split('\n').slice(1).join(' ') || b.text}</p>
      </button>
    </article>
  );
}
