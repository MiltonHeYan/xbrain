import {useState} from 'react';
import type {Bookmark} from '../../shared/types.js';
import {safeUrl} from '../../shared/bookmarks.js';
import {Dialog} from './Dialog.js';
import {MediaPreview} from './BookmarkCard.js';
import {date} from '../selectors.js';
export function DetailDialog({
  bookmark: b,
  demo,
  onClose,
}: {
  bookmark: Bookmark;
  demo: boolean;
  onClose: () => void;
}) {
  const [externalImages, setExternalImages] = useState(false);
  const images = b.media.filter((m) => m.type === 'image' && safeUrl(m.url));
  return (
    <Dialog id="detail-dialog" titleId="detail-title" onClose={onClose}>
      <h2 id="detail-title" className="sr-only">
        Bookmark details
      </h2>
      <div className="detail-heading">
        <strong>{b.author.name || 'Unknown author'}</strong>
        {b.author.username && <span>@{b.author.username}</span>}
      </div>
      <div className="detail-text">{b.text}</div>
      {b.summary && (
        <div className="detail-summary">
          <span>Summary</span>
          <p>{b.summary}</p>
        </div>
      )}
      {!!images.length && (
        <div className="media-settings">
          <label>
            <input
              id="external-images"
              type="checkbox"
              checked={externalImages}
              onChange={(e) => setExternalImages(e.target.checked)}
            />{' '}
            Show external images
          </label>
          <small>Third-party hosts receive your IP address. Off by default.</small>
        </div>
      )}
      {externalImages &&
        images.map((m, i) => <MediaPreview key={m.url + i} media={m} enabled detail />)}
      {b.note && (
        <div className="detail-summary">
          <span>Your note</span>
          <p>{b.note}</p>
        </div>
      )}
      <div className="detail-meta">
        <span>Saved {date(b.savedAt)}</span>
        {safeUrl(b.url) ? (
          <a href={safeUrl(b.url)} target="_blank" rel="noopener noreferrer">
            Open original ↗
          </a>
        ) : (
          <span>{demo ? 'Fictional sample' : 'Original link unavailable'}</span>
        )}
      </div>
    </Dialog>
  );
}
