import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, cleanup} from '@testing-library/react';
import {App} from '../../src/client/App.js';
import {normalizeImport} from '../../src/shared/bookmarks.js';
import {STORAGE_KEY} from '../../src/client/repository.js';
import type {Bookmark} from '../../src/shared/types.js';
const raw = {
  bookmarks: [
    {
      id: 'qa-one',
      text: 'A synthetic design idea',
      author: {name: 'QA Author', username: 'qatest'},
      tags: ['Design'],
      summary: 'Synthetic summary',
      enrichment: {kind: 'agent', agent: 'Synthetic QA agent', generatedAt: '2026-10-02T00:00:00Z'},
      media: [{type: 'image', url: 'https://images.example.test/qa.png'}],
    },
    {id: 'qa-two', text: 'A synthetic coding idea', author: {name: 'Second Author'}, tags: []},
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
function change(selector: string, value: string) {
  fireEvent.change(element(selector), {target: {value}});
}
async function start(saved = true) {
  if (saved) localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, bookmarks: data()}));
  render(<App />);
  await screen.findByText(saved ? 'BROWSER LIBRARY' : 'DEMO COLLECTION');
}
async function importJSON(value: unknown) {
  click('#open-import');
  change('#import-json', typeof value === 'string' ? value : JSON.stringify(value));
  click('#import-submit');
}
async function savedClose() {
  await waitFor(() => expect(document.querySelector('#detail-dialog')).toBeNull());
}
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', {status: 404})),
  );
});
describe('React migration: former DOM scenarios', () => {
  it('fresh static preview starts with twelve fictional samples and no persisted data', async () => {
    await start(false);
    expect(document.querySelectorAll('.card')).toHaveLength(12);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('invalid JSON keeps the collection and import dialog', async () => {
    await start();
    await importJSON('{bad');
    await screen.findByText(/isn’t valid JSON/);
    expect(document.querySelectorAll('.card')).toHaveLength(2);
    expect(element<HTMLDialogElement>('#import-dialog').open).toBe(true);
  });
  it('cancel and reopen retains import draft without mutating records', async () => {
    await start();
    click('#open-import');
    change('#import-json', '{bad');
    click('#cancel-import');
    click('#open-import');
    expect(element<HTMLTextAreaElement>('#import-json').value).toBe('{bad');
    expect(stored()).toHaveLength(2);
  });
  it('guide closes import and exposes return control', async () => {
    await start();
    click('#open-import');
    click('#import-guide');
    expect(document.querySelector('#import-dialog')).toBeNull();
    expect(element('#guide-back')).toBeInTheDocument();
  });
  it('back from guide preserves import draft', async () => {
    await start();
    click('#open-import');
    change('#import-json', 'draft');
    click('#import-guide');
    click('#guide-back');
    expect(element<HTMLTextAreaElement>('#import-json').value).toBe('draft');
  });
  it('first import replaces samples with personal records', async () => {
    await start(false);
    await importJSON(raw);
    await screen.findByText('BROWSER LIBRARY');
    expect(stored()).toHaveLength(2);
    expect(document.querySelectorAll('.card')).toHaveLength(2);
    expect(stored().some((b) => b.id.startsWith('demo-'))).toBe(false);
  });
  it('external images have no img or src before opt-in', async () => {
    await start();
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(element<HTMLInputElement>('#external-images').checked).toBe(false);
    expect(screen.getByText('Image kept private')).toBeInTheDocument();
  });
  it('opt-in inserts a safe image source', async () => {
    await start();
    click('#external-images');
    expect(element<HTMLImageElement>('img').src).toBe('https://images.example.test/qa.png');
  });
  it('opt-out removes remote image elements', async () => {
    await start();
    click('#external-images');
    click('#external-images');
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
  it('multiword search matches author and post text', async () => {
    await start();
    change('#search', 'design QA');
    expect(document.querySelectorAll('.card')).toHaveLength(1);
  });
  it('no-result search recovers by clearing filters', async () => {
    await start();
    change('#search', 'unfindable');
    expect(screen.getByText('No bookmarks match yet.')).toBeInTheDocument();
    click('#empty-action');
    expect(document.querySelectorAll('.card')).toHaveLength(2);
  });
  it('favorites save and mobile Favorites filtering work', async () => {
    await start();
    click('[data-favorite="qa-one"]');
    await waitFor(() => expect(stored()[0]?.favorite).toBe(true));
    change('#mobile-view', 'favorites');
    expect(document.querySelectorAll('.card')).toHaveLength(1);
    expect(element('#favorite-count').textContent).toBe('1');
  });
  it('canceling details discards unsaved fields', async () => {
    await start();
    click('[data-open="qa-one"]');
    change('#edit-note', 'Do not save');
    click('#cancel-detail');
    click('[data-open="qa-one"]');
    expect(element<HTMLTextAreaElement>('#edit-note').value).toBe('');
  });
  it('note-only edits preserve agent provenance', async () => {
    await start();
    click('[data-open="qa-one"]');
    change('#edit-note', 'Synthetic saved note');
    click('#save-detail');
    await savedClose();
    expect(stored()[0]?.note).toBe('Synthetic saved note');
    expect(stored()[0]?.enrichment.kind).toBe('agent');
  });
  it('summary and tags edits persist as user annotations', async () => {
    await start();
    click('[data-open="qa-one"]');
    change('#edit-tags', 'Edited, Useful');
    change('#edit-summary', 'Edited summary');
    click('#save-detail');
    await savedClose();
    expect(stored()[0]?.tags).toEqual(['Edited', 'Useful']);
    expect(stored()[0]?.enrichment.kind).toBe('user');
    expect(stored()[0]?.summary).toBe('Edited summary');
  });
  it('invalid long tags keep the dialog and previous tags', async () => {
    await start();
    click('[data-open="qa-one"]');
    change('#edit-tags', 'x'.repeat(61));
    click('#save-detail');
    await screen.findByText(/60 characters in each/);
    expect(stored()[0]?.tags).toEqual(['Design']);
    expect(element<HTMLDialogElement>('#detail-dialog').open).toBe(true);
  });
  it('export contains the whole library, not just filtered cards', async () => {
    await start();
    let downloaded: Blob | undefined;
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn((b: Blob) => {
          downloaded = b;
          return 'blob:synthetic';
        }),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    change('#search', 'design');
    click('#export');
    const exported = JSON.parse(await downloaded!.text());
    expect(exported.bookmarks).toHaveLength(2);
    expect(exported.source.demo).toBe(false);
  });
  it('refresh retains edits and resets image consent', async () => {
    await start();
    click('[data-favorite="qa-one"]');
    await waitFor(() => expect(stored()[0]?.favorite).toBe(true));
    click('#external-images');
    cleanup();
    render(<App />);
    await screen.findByText('BROWSER LIBRARY');
    expect(element<HTMLInputElement>('#external-images').checked).toBe(false);
    expect(element('[data-favorite="qa-one"]').getAttribute('aria-pressed')).toBe('true');
  });
  it('duplicate import refreshes text but preserves annotations', async () => {
    await start();
    await importJSON({
      bookmarks: [{id: 'qa-one', text: 'New source', summary: 'Replace', tags: ['Replace']}],
    });
    await waitFor(() => expect(document.querySelector('#import-dialog')).toBeNull());
    expect(stored()).toHaveLength(2);
    expect(stored()[0]?.text).toBe('New source');
    expect(stored()[0]?.summary).toBe('Synthetic summary');
  });
  it('demo exports cannot mix into the private library', async () => {
    await start();
    await importJSON({source: {demo: true}, ...raw});
    await screen.findByText(/This is a sample export/);
    expect(stored()).toHaveLength(2);
  });
  it('quota failure preserves both displayed and saved favorite', async () => {
    await start();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    click('[data-favorite="qa-one"]');
    await screen.findByText(/No changes were saved/);
    expect(stored()[0]?.favorite).not.toBe(true);
    expect(element('[data-favorite="qa-one"]').getAttribute('aria-pressed')).toBe('false');
  });
  it('backend failure blocks import and never falls back to demo', async () => {
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
    expect(element<HTMLButtonElement>('#open-import').disabled).toBe(true);
    expect(document.querySelectorAll('.card')).toHaveLength(0);
  });
  it('corrupt browser data is never reset', async () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    render(<App />);
    await screen.findByText(/Nothing has been overwritten/);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
  });
  it('a fresh Node library is empty and offers separate samples', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"version":1,"bookmarks":[]}', {
            headers: {'content-type': 'application/json'},
          }),
      ),
    );
    render(<App />);
    await screen.findByText('LOCAL LIBRARY');
    expect(document.querySelectorAll('.card')).toHaveLength(0);
    expect(element('#explore-demo')).toBeInTheDocument();
  });
  it('sample edits never enter the real Node library', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response('{"version":1,"bookmarks":[]}', {
          headers: {'content-type': 'application/json'},
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    await screen.findByText('LOCAL LIBRARY');
    click('#explore-demo');
    click('[data-favorite]');
    click('#return-library');
    expect(document.querySelectorAll('.card')).toHaveLength(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
describe('additional migration regressions', () => {
  it('topic and untagged filters remain reachable', async () => {
    await start();
    fireEvent.click(element('#chips button:nth-child(2)'));
    expect(document.querySelectorAll('.card')).toHaveLength(1);
    change('#mobile-view', 'untagged');
    expect(element('[data-open="qa-two"]')).toBeInTheDocument();
  });
  it('switches list layout and sorts by author', async () => {
    await start();
    click('#list-view');
    expect(element('#gallery')).toHaveClass('list');
    change('#sort', 'author');
    expect(document.querySelector('.card-open')?.getAttribute('data-open')).toBe('qa-one');
  });
  it('renders untrusted markup as literal text', async () => {
    const b = data();
    b[0]!.text = '<img src=x onerror=alert(1)>';
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, bookmarks: b}));
    render(<App />);
    await screen.findByText('BROWSER LIBRARY');
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
  it('slash keyboard shortcut focuses search', async () => {
    await start();
    fireEvent.keyDown(document, {key: '/'});
    expect(element('#search')).toHaveFocus();
  });
  it('Escape closes a detail without saving', async () => {
    await start();
    click('[data-open="qa-one"]');
    change('#edit-summary', 'Unsaved');
    fireEvent(element('#detail-dialog'), new Event('cancel', {bubbles: true, cancelable: true}));
    expect(document.querySelector('#detail-dialog')).toBeNull();
    expect(stored()[0]?.summary).toBe('Synthetic summary');
  });
  it('invalid successful API payload fails closed', async () => {
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
    expect(element<HTMLButtonElement>('#open-import').disabled).toBe(true);
  });
});
