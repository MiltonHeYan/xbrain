import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {App} from '../../src/client/App.js';
import {normalizeImport} from '../../src/shared/bookmarks.js';
import {STORAGE_KEY} from '../../src/client/repository.js';

beforeEach(() => {
  const bookmarks = normalizeImport({
    bookmarks: [
      {
        id: 'simple-gallery',
        text: 'A saved idea in a simple gallery',
        author: {name: 'Example Author'},
        tags: ['Design', 'Development'],
        favorite: true,
      },
    ],
  }).bookmarks;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, bookmarks}));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', {status: 404})),
  );
});
async function openGallery() {
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('.card')).toHaveLength(1));
}
function expectNoManualWorkflow() {
  expect(
    document.querySelector(
      '#open-import, #import-dialog, #import-json, #import-submit, input[type="file"], ' +
        '#export, #mobile-export, #edit-tags, #edit-summary, #edit-note, #save-detail',
    ),
  ).toBeNull();
  expect(
    screen.queryByRole('button', {name: /import|export|save changes|edit bookmark/i}),
  ).not.toBeInTheDocument();
  expect(document.querySelector('textarea, [contenteditable="true"]')).toBeNull();
}

describe('Minimal gallery surface', () => {
  it('has xstash branding, a single search input, and a result count', async () => {
    await openGallery();
    expect(screen.getByText(/^xstash$/i)).toBeInTheDocument();
    expect(document.querySelectorAll('input')).toHaveLength(1);
    expect(document.querySelector('#search')).toHaveAccessibleName(/search/i);
    expect(document.querySelector('#result-count')).toHaveTextContent(/1/);
    expect(screen.getByRole('region', {name: 'Bookmarks'})).toBeInTheDocument();
  });
  it('does not render sidebar navigation, category tabs, or topic chips', async () => {
    await openGallery();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(
      document.querySelector('aside, .sidebar, #chips, .topic-button, .topic-chip'),
    ).toBeNull();
    expect(screen.queryByRole('button', {name: /^Design$|^Development$/})).not.toBeInTheDocument();
  });
  it('does not render collection filters, sorting, layout toggles, or favorite actions', async () => {
    await openGallery();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Layout'})).not.toBeInTheDocument();
    expect(
      document.querySelector(
        '#mobile-view, #sort, #list-view, #grid-view, [data-favorite], .filters, .view-tabs',
      ),
    ).toBeNull();
    expect(
      screen.queryByRole('button', {name: /grid view|list view|favorites|clear filters/i}),
    ).not.toBeInTheDocument();
  });
  it('offers no manual import, file, JSON, export, or editing workflow', async () => {
    await openGallery();
    expectNoManualWorkflow();
    expect(document.querySelector('#guide-dialog, #import-guide, #guide-back')).toBeNull();
  });
  it('keeps details read-only without restoring removed workflows', async () => {
    await openGallery();
    fireEvent.click(document.querySelector('[data-open="simple-gallery"]')!);
    expect(document.querySelector('#detail-dialog')).toBeInTheDocument();
    expectNoManualWorkflow();
    expect(screen.queryByRole('button', {name: /favorite|tag|category/i})).not.toBeInTheDocument();
  });
  it('searching does not add a second layer of filter controls', async () => {
    await openGallery();
    fireEvent.change(document.querySelector('#search')!, {target: {value: 'saved idea'}});
    expect(document.querySelectorAll('.card')).toHaveLength(1);
    expect(document.querySelectorAll('input')).toHaveLength(1);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(document.querySelector('#chips, .view-tabs, .topic-button')).toBeNull();
    expectNoManualWorkflow();
  });
});
