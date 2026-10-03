import {useState} from 'react';
import type {Bookmark, BookmarkPatch} from '../../shared/types.js';
import {errorMessage} from '../../shared/types.js';
import {normalizeBookmarkPatch, safeUrl} from '../../shared/bookmarks.js';
import {Dialog} from './Dialog.js';
import {MediaPreview} from './BookmarkCard.js';
import {date} from '../selectors.js';
export function DetailDialog({
  bookmark: b,
  demo,
  externalImages,
  onClose,
  onSave,
}: {
  bookmark: Bookmark;
  demo: boolean;
  externalImages: boolean;
  onClose: () => void;
  onSave: (patch: BookmarkPatch) => Promise<void>;
}) {
  const [tags, setTags] = useState(b.tags.join(', ')),
    [summary, setSummary] = useState(b.summary),
    [note, setNote] = useState(b.note ?? '');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      const nextTags = [
        ...new Set(
          tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ];
      if (nextTags.length > 30 || nextTags.some((t) => t.length > 60))
        throw new Error('Use up to 30 tags, with no more than 60 characters in each.');
      const fields: BookmarkPatch = {};
      if (JSON.stringify(nextTags) !== JSON.stringify(b.tags)) fields.tags = nextTags;
      if (summary !== b.summary) fields.summary = summary;
      if (note !== (b.note ?? '')) fields.note = note;
      await onSave(normalizeBookmarkPatch(fields));
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog id="detail-dialog" titleId="detail-title" onClose={onClose} busy={busy}>
      <div className="detail-heading">
        <div className="author">
          <span className="avatar">{b.author.name[0] || '?'}</span>
          <div className="author-info">
            <strong>{b.author.name}</strong>
            <small>{b.author.username ? '@' + b.author.username : 'Author unavailable'}</small>
          </div>
        </div>
      </div>
      {b.media
        .filter((m) => m.type === 'image' && safeUrl(m.url))
        .map((m, i) => (
          <MediaPreview key={m.url + i} media={m} enabled={externalImages} detail />
        ))}
      <h2 id="detail-title" className="sr-only">
        Bookmark details
      </h2>
      <div className="detail-text">{b.text}</div>
      {b.summary && (
        <div className="detail-summary">
          <small>
            {demo
              ? 'SAMPLE SUMMARY'
              : b.enrichment.kind === 'agent'
                ? 'AGENT SUMMARY'
                : 'SAVED SUMMARY'}
          </small>
          {b.summary}
        </div>
      )}
      <div className="detail-meta">
        {safeUrl(b.url) ? (
          <a href={safeUrl(b.url)} target="_blank" rel="noopener noreferrer">
            Open original ↗
          </a>
        ) : (
          <span>{demo ? 'Fictional sample · no original post' : 'Original link unavailable'}</span>
        )}
        <span>Saved {date(b.savedAt)}</span>
      </div>
      <label className="field-label" htmlFor="edit-tags">
        Tags · separated by commas
      </label>
      <input
        id="edit-tags"
        className="detail-input"
        maxLength={2000}
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        aria-describedby="tags-help"
      />
      <small className="field-hint" id="tags-help">
        Up to 30 tags, 60 characters each.
      </small>
      <label className="field-label" htmlFor="edit-summary">
        Summary
      </label>
      <textarea
        id="edit-summary"
        rows={3}
        maxLength={4000}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <label className="field-label" htmlFor="edit-note">
        Your note
      </label>
      <textarea
        id="edit-note"
        rows={2}
        maxLength={10000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <p id="detail-error" className="error" role="alert">
        {error}
      </p>
      <div className="detail-save-row">
        <button id="cancel-detail" className="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button id="save-detail" className="primary" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Dialog>
  );
}
