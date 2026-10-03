import {beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {App} from '../../src/client/App.js';
import {normalizeImport} from '../../src/shared/bookmarks.js';
import {LibraryRepository, STORAGE_KEY, exportLibrary} from '../../src/client/repository.js';
import type {Bookmark} from '../../src/shared/types.js';

const raw = {
  bookmarks: [
    {
      id: 'qa-one',
      savedAt: '2026-10-02T12:00:00Z',
      text: 'A synthetic design idea',
      url: 'https://x.com/qatest/status/123',
      author: {name: 'QA Author', username: 'qatest'},
      tags: ['Design'],
      summary: 'Synthetic summary',
      enrichment: {kind: 'agent', agent: 'Synthetic QA agent', generatedAt: '2026-10-02T00:00:00Z'},
      media: [{type: 'image', url: 'https://images.example.test/qa.png'}],
    },
    {
      id: 'qa-two',
      savedAt: '2026-10-01T12:00:00Z',
      text: 'A synthetic coding idea',
      author: {name: 'Second Author'},
      tags: [],
    },
  ],
};
const data = () => normalizeImport(raw).bookmarks;
function stored(): Bookmark[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{"bookmarks":[]}').bookmarks;
}
function element<T extends Element = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error('Missing ' + selector);
  return found;
}
function click(selector: string) {
  fireEvent.click(element(selector));
}
function search(value: string) {
  fireEvent.change(element('#search'), {target: {value}});
}
async function start(saved = true) {
  if (saved) localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, bookmarks: data()}));
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('.card')).toHaveLength(saved ? 2 : 12));
}
function serverResponse(bookmarks: Bookmark[]) {
  return new Response(JSON.stringify({version: 1, bookmarks}), {
    headers: {'content-type': 'application/json'},
  });
}
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', {status: 404})),
  );
});

describe('Read-only bookmark gallery', () => {
  it('fresh static preview shows twelve fictional samples without saving them', async () => {
    await start(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByText(/sample/i)).toBeInTheDocument();
  });
  it('opens an existing browser library without changing its records', async () => {
    await start();
    expect(screen.getByText('A synthetic design idea')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'A synthetic coding idea'})).toBeInTheDocument();
    expect(stored()).toEqual(data());
  });
  it('loads a real API library and does not persist a browser copy', async () => {
    const fetcher = vi.fn(async () => serverResponse(data()));
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    await screen.findByText('A synthetic design idea');
    expect(document.querySelectorAll('.card')).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledWith('/api/bookmarks', expect.any(Object));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('keeps an empty API library empty and explains agent sync', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => serverResponse([])),
    );
    render(<App />);
    await screen.findByText(/agent/i);
    expect(document.querySelectorAll('.card')).toHaveLength(0);
    expect(document.querySelector('#import-dialog, #open-import, input[type="file"]')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('multiword search matches author and post text and updates the result count', async () => {
    await start();
    search('design QA');
    expect(document.querySelectorAll('.card')).toHaveLength(1);
    expect(element('#result-count')).toHaveTextContent(/1/);
    expect(element('[data-open="qa-one"]')).toBeInTheDocument();
  });
  it('search finds retained annotations without exposing category controls', async () => {
    await start();
    search('Synthetic summary');
    expect(document.querySelectorAll('.card')).toHaveLength(1);
    expect(element('[data-open="qa-one"]')).toBeInTheDocument();
  });
  it('no-result search recovers when the search is cleared', async () => {
    await start();
    search('unfindable');
    expect(document.querySelectorAll('.card')).toHaveLength(0);
    expect(element('#result-count')).toHaveTextContent(/0/);
    search('');
    expect(document.querySelectorAll('.card')).toHaveLength(2);
    expect(element('#result-count')).toHaveTextContent(/2/);
  });
  it('slash keyboard shortcut focuses the single search input', async () => {
    await start();
    fireEvent.keyDown(document, {key: '/'});
    expect(element('#search')).toHaveFocus();
  });
  it('opens read-only details, closes them, and opens another bookmark', async () => {
    await start();
    const original = localStorage.getItem(STORAGE_KEY);
    click('[data-open="qa-one"]');
    const dialog = element<HTMLDialogElement>('#detail-dialog');
    expect(dialog.open).toBe(true);
    expect(within(dialog).getByText('A synthetic design idea')).toBeInTheDocument();
    expect(within(dialog).getByText('Synthetic summary')).toBeInTheDocument();
    expect(
      dialog.querySelector('textarea, input:not([type="checkbox"]), [contenteditable]'),
    ).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', {name: 'Close dialog'}));
    expect(document.querySelector('#detail-dialog')).toBeNull();
    click('[data-open="qa-two"]');
    expect(
      within(element('#detail-dialog')).getByText('A synthetic coding idea'),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });
  it('Escape dismisses details without changing stored data', async () => {
    await start();
    const original = localStorage.getItem(STORAGE_KEY);
    click('[data-open="qa-one"]');
    fireEvent(element('#detail-dialog'), new Event('cancel', {bubbles: true, cancelable: true}));
    expect(document.querySelector('#detail-dialog')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });
  it('returns focus to the card after the detail dialog closes', async () => {
    await start();
    const card = element<HTMLElement>('[data-open="qa-one"]');
    card.focus();
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', {name: 'Close dialog'}));
    expect(card).toHaveFocus();
  });
  it('opening details and searching never sends write requests', async () => {
    const fetcher = vi.fn(async () => serverResponse(data()));
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    await screen.findByText('A synthetic design idea');
    click('[data-open="qa-one"]');
    fireEvent.click(screen.getByRole('button', {name: 'Close dialog'}));
    search('coding');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('external images have no image element before explicit consent, including in details', async () => {
    await start();
    expect(document.querySelectorAll('img')).toHaveLength(0);
    click('[data-open="qa-one"]');
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(element<HTMLInputElement>('#external-images').checked).toBe(false);
  });
  it('image opt-in adds the safe source and opt-out removes every remote image', async () => {
    await start();
    click('[data-open="qa-one"]');
    click('#external-images');
    const images = [...document.querySelectorAll<HTMLImageElement>('img')];
    expect(images.length).toBeGreaterThan(0);
    expect(images.every((img) => img.src === 'https://images.example.test/qa.png')).toBe(true);
    click('#external-images');
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
  it('closing and reopening details requires fresh image consent', async () => {
    await start();
    click('[data-open="qa-one"]');
    click('#external-images');
    expect(document.querySelectorAll('img').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', {name: 'Close dialog'}));
    expect(document.querySelectorAll('img')).toHaveLength(0);
    click('[data-open="qa-one"]');
    expect(element<HTMLInputElement>('#external-images').checked).toBe(false);
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
  it('reloading the gallery resets image consent without losing saved annotations', async () => {
    await start();
    click('[data-open="qa-one"]');
    click('#external-images');
    cleanup();
    render(<App />);
    await screen.findByText('A synthetic design idea');
    click('[data-open="qa-one"]');
    expect(element<HTMLInputElement>('#external-images').checked).toBe(false);
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(stored()[0]?.enrichment.kind).toBe('agent');
    expect(stored()[0]?.summary).toBe('Synthetic summary');
  });
  it('uses a safe original-post link in read-only details', async () => {
    await start();
    click('[data-open="qa-one"]');
    const link = within(element('#detail-dialog')).getByRole('link', {name: /Open original/});
    expect(link).toHaveAttribute('href', 'https://x.com/qatest/status/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
  it('renders untrusted markup as literal text', async () => {
    const bookmarks = data();
    bookmarks[0]!.text = '<img src=x onerror=alert(1)>';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, bookmarks}));
    render(<App />);
    await screen.findByText('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
    click('[data-open="qa-one"]');
    expect(
      within(element('#detail-dialog')).getByText('<img src=x onerror=alert(1)>'),
    ).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('Library load failures', () => {
  it('backend errors never silently fall back to samples or browser records', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, bookmarks: data()}));
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"error":"Synthetic backend failure"}', {
            status: 500,
            headers: {'content-type': 'application/json'},
          }),
      ),
    );
    render(<App />);
    await screen.findByText(/Synthetic backend failure/);
    expect(document.querySelectorAll('.card')).toHaveLength(0);
    expect(stored()).toHaveLength(2);
  });
  it('network failures do not display a fictional collection as a real library', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Synthetic network failure');
      }),
    );
    render(<App />);
    await screen.findByText(/Synthetic network failure/);
    expect(document.querySelectorAll('.card')).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('can retry a failed read and display the recovered real library', async () => {
    const fetcher = vi
      .fn(async () => serverResponse(data()))
      .mockRejectedValueOnce(new Error('Temporary connection failure'));
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    await screen.findByText(/Temporary connection failure/);
    fireEvent.click(screen.getByRole('button', {name: 'Try again'}));
    await screen.findByText('A synthetic design idea');
    expect(document.querySelectorAll('.card')).toHaveLength(2);
    expect(screen.queryByText(/Temporary connection failure/)).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('corrupt browser data is never reset', async () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    render(<App />);
    await screen.findByText(/Nothing has been overwritten/);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
    expect(document.querySelectorAll('.card')).toHaveLength(0);
  });
  it('invalid successful API payloads fail closed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"version":1,"bookmarks":[null]}', {
            headers: {'content-type': 'application/json'},
          }),
      ),
    );
    render(<App />);
    await screen.findByText(/Nothing has been overwritten/);
    expect(document.querySelectorAll('.card')).toHaveLength(0);
  });
});

// The agent-facing persistence adapter keeps its safety contracts even though
// manual import and editing controls are deliberately absent from the gallery.
describe('Browser persistence adapter regressions', () => {
  async function repository() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, bookmarks: data()}));
    const repo = new LibraryRepository();
    await repo.load();
    return repo;
  }
  it('rejects invalid JSON without changing existing records', async () => {
    const repo = await repository();
    await expect(repo.import('{bad', data())).rejects.toThrow(/isn’t valid JSON/);
    expect(stored()).toEqual(data());
  });
  it('rejects sample exports from the private library', async () => {
    const repo = await repository();
    await expect(
      repo.import(JSON.stringify({source: {demo: true}, ...raw}), data()),
    ).rejects.toThrow(/sample export/);
    expect(stored()).toEqual(data());
  });
  it('duplicate imports refresh source text while preserving annotations', async () => {
    const repo = await repository();
    const result = await repo.import(
      JSON.stringify({
        bookmarks: [{id: 'qa-one', text: 'New source', summary: 'Replace', tags: ['Replace']}],
      }),
      data(),
    );
    expect(result.bookmarks).toHaveLength(2);
    expect(stored()[0]?.text).toBe('New source');
    expect(stored()[0]?.summary).toBe('Synthetic summary');
    expect(stored()[0]?.tags).toEqual(['Design']);
    expect(stored()[0]?.enrichment.kind).toBe('agent');
  });
  it('note-only updates preserve agent provenance', async () => {
    const repo = await repository();
    await repo.update('qa-one', {note: 'Synthetic saved note'}, data());
    expect(stored()[0]?.note).toBe('Synthetic saved note');
    expect(stored()[0]?.enrichment.kind).toBe('agent');
  });
  it('summary and tag updates are persisted as user annotations', async () => {
    const repo = await repository();
    await repo.update('qa-one', {tags: ['Edited', 'Useful'], summary: 'Edited summary'}, data());
    expect(stored()[0]?.tags).toEqual(['Edited', 'Useful']);
    expect(stored()[0]?.summary).toBe('Edited summary');
    expect(stored()[0]?.enrichment.kind).toBe('user');
  });
  it('quota failures leave the previous saved records unchanged', async () => {
    const repo = await repository();
    const current = data();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await expect(repo.update('qa-one', {note: 'Unsaved'}, current)).rejects.toThrow(
      /No changes were saved/,
    );
    expect(stored()).toEqual(current);
    expect(current[0]?.note).not.toBe('Unsaved');
  });
  it('agent exports contain the whole library and mark real data', async () => {
    let downloaded: Blob | undefined;
    vi.useFakeTimers();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL(blob: Blob) {
          downloaded = blob;
          return 'blob:synthetic';
        }
        static override revokeObjectURL = vi.fn();
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      exportLibrary(data(), false);
      const exported = JSON.parse(await downloaded!.text());
      expect(exported.bookmarks).toHaveLength(2);
      expect(exported.source.demo).toBe(false);
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
    }
  });
});
