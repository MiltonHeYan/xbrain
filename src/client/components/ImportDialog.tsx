import {useState} from 'react';
import {errorMessage} from '../../shared/types.js';
import {MAX_IMPORT_BYTES} from '../../shared/bookmarks.js';
import {Dialog} from './Dialog.js';
export function ImportDialog({
  draft,
  setDraft,
  onImport,
  onClose,
  onGuide,
  local,
  demo,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onImport: () => Promise<void>;
  onClose: () => void;
  onGuide: () => void;
  local: boolean;
  demo: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit() {
    setBusy(true);
    setError('');
    try {
      await onImport();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function fileChange(file: File | undefined) {
    if (!file) return;
    setDraft('');
    if (file.size > MAX_IMPORT_BYTES) {
      setError('Please choose a JSON file smaller than 10 MiB.');
      return;
    }
    try {
      setDraft(await file.text());
      setError('');
    } catch {
      setError('This file could not be read.');
    }
  }
  return (
    <Dialog id="import-dialog" titleId="import-title" onClose={onClose} busy={busy}>
      <div className="dialog-heading">
        <span className="dialog-icon">⇩</span>
        <h2 id="import-title">Bring your bookmarks home.</h2>
        <p>Import a JSON export from your agent or X. Re-import anytime; duplicates are merged.</p>
      </div>
      <label className="file-drop" htmlFor="file-input">
        <span>↑</span>
        <strong>Choose a JSON file</strong>
        <small>or paste the contents below · up to 10 MiB</small>
        <input
          id="file-input"
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            void fileChange(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      <label className="field-label" htmlFor="import-json">
        JSON contents
      </label>
      <textarea
        id="import-json"
        rows={5}
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
      />
      <p className="import-privacy">
        {local
          ? 'Saved to your local data file. No model keys or account connection in this app.'
          : 'Your import stays in this browser. No model keys or account connection.'}
      </p>
      <p className="import-privacy">
        {demo
          ? 'Samples stay separate. Importing opens your own collection.'
          : 'New bookmarks are added; existing favorites, notes, tags, and summaries are kept.'}
      </p>
      <p id="import-error" className="error" role="alert">
        {error}
      </p>
      <button id="import-guide" className="text-button" disabled={busy} onClick={onGuide}>
        Need an export? Get agent instructions ↗
      </button>
      <div className="dialog-actions">
        <button id="cancel-import" className="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          id="import-submit"
          className="primary"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? 'Importing…' : 'Import collection'}
        </button>
      </div>
    </Dialog>
  );
}
