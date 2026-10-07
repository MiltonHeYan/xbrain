import {useEffect, useState} from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {test, expect, vi, afterEach, beforeEach} from 'vitest';
import type {DesignGraph as GraphData} from '../../src/shared/design-graph.js';
import {Workspace} from '../../src/client/Workspace.js';
vi.mock('../../src/client/App.js', () => ({
  App: ({onCount}: {onCount: (n: number) => void}) => {
    const [q, setQ] = useState('');
    useEffect(() => onCount(3), [onCount]);
    return <input aria-label="Gallery search" value={q} onChange={(e) => setQ(e.target.value)} />;
  },
}));
vi.mock('../../src/client/DesignGraph.js', () => ({
  DesignGraph: ({
    onCount,
    providedData,
  }: {
    onCount: (n: number) => void;
    providedData?: GraphData;
  }) => {
    const [q, setQ] = useState('');
    useEffect(() => onCount(20), [onCount]);
    return (
      <>
        <input aria-label="Graph search" value={q} onChange={(e) => setQ(e.target.value)} />
        <output data-testid="graph-ids">
          {providedData?.resources.map((r) => r.id).join(',')}
        </output>
      </>
    );
  },
}));
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({status: 409})));
afterEach(() => window.history.replaceState(null, '', '/'));
test('two horizontal tabs keep each view state and respond to Back/Forward locations', async () => {
  window.history.replaceState(null, '', '/?view=graph');
  render(<Workspace />);
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  expect(screen.getByRole('tab', {name: 'Graph'})).toHaveAttribute('aria-selected', 'true');
  await screen.findByLabelText('Graph search');
  fireEvent.change(screen.getByLabelText('Graph search'), {target: {value: 'modular'}});
  fireEvent.click(screen.getByRole('tab', {name: 'Gallery'}));
  expect(window.location.search).toBe('');
  expect(screen.getByText('3 bookmarks')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Gallery search'), {target: {value: 'design'}});
  window.history.replaceState(null, '', '/?view=graph');
  fireEvent.popState(window);
  expect(screen.getByLabelText('Graph search')).toHaveValue('modular');
  expect(screen.getByText('20 references')).toBeInTheDocument();
  window.history.replaceState(null, '', '/');
  fireEvent.popState(window);
  expect(screen.getByLabelText('Gallery search')).toHaveValue('design');
});
test('arrow keys activate the other tab and move focus; Home returns to Gallery', () => {
  render(<Workspace />);
  const gallery = screen.getByRole('tab', {name: 'Gallery'});
  gallery.focus();
  fireEvent.keyDown(gallery, {key: 'ArrowRight'});
  const graph = screen.getByRole('tab', {name: 'Graph'});
  expect(graph).toHaveFocus();
  expect(graph).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(graph, {key: 'Home'});
  expect(gallery).toHaveFocus();
  expect(gallery).toHaveAttribute('aria-selected', 'true');
});

test('selected memory supplies the Gallery without requesting legacy data', async () => {
  const resources = Array.from({length: 61}, (_, i) => ({
    id: `fixture-${i}`,
    title: `Fixture ${i}`,
    source: {provider: 'x', id: String(i), url: `https://example.com/${i}`},
    text: '',
    summary: '',
    purpose: '',
    useWhen: [],
    limitations: [],
    savedReason: null,
    updatedAt: '2026-10-07T00:00:00Z',
  }));
  const data = {resources, total: 61, matched: 61, offset: 0, hasMore: false};
  const fetch = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => data});
  vi.stubGlobal('fetch', fetch);
  const {container} = render(<Workspace />);
  await screen.findByText('61 bookmarks');
  expect(
    Array.from(container.querySelectorAll('[data-resource-id]'), (n) =>
      n.getAttribute('data-resource-id'),
    ),
  ).toEqual(resources.map((r) => r.id));
  fireEvent.click(screen.getByRole('tab', {name: 'Graph'}));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]![0]).toBe('/api/references');
});

test('Gallery loads supplied source images by default, preserves the toggle, and reports failed images', async () => {
  const data = {
    resources: [
      {
        id: 'image-fixture',
        title: 'Synthetic image fixture',
        source: {provider: 'x', id: 'fixture', url: 'https://example.com/post'},
        text: '',
        summary: '',
        design: {
          status: 'unanalyzed',
          images: [{url: 'https://example.com/image.png', observed: false}],
          domains: [],
          features: [],
          styles: [],
          analyzedAt: null,
          reason: 'Synthetic fixture',
        },
      },
    ],
    total: 1,
    matched: 1,
    offset: 0,
    hasMore: false,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => data}),
  );
  const first = render(<Workspace />);
  const img = await screen.findByRole('img');
  expect(img).toHaveAttribute('src', 'https://example.com/image.png');
  expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  fireEvent.error(img);
  expect(screen.getByText('Image unavailable. Open the original post.')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Show source images'));
  expect(localStorage.getItem('xbrain.source-images')).toBe('off');
  first.unmount();
  render(<Workspace />);
  await screen.findByText('1 bookmarks');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Show source images'));
  expect(screen.getByRole('img')).toBeInTheDocument();
});

test('static HTML response falls back to the existing browser Gallery', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response('<!doctype html><html></html>', {headers: {'Content-Type': 'text/html'}}),
      ),
  );
  render(<Workspace />);
  expect(await screen.findByLabelText('Gallery search')).toBeInTheDocument();
});

for (const status of [403, 500]) {
  test(`API ${status} error does not fall back to a different library`, async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({error: 'Synthetic failure'}), {
          status,
          headers: {'Content-Type': 'application/json'},
        }),
      ),
    );
    render(<Workspace />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Synthetic failure');
    expect(screen.queryByLabelText('Gallery search')).not.toBeInTheDocument();
  });
}
test('network errors and unreadable JSON do not silently change libraries', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Synthetic offline')));
  const first = render(<Workspace />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Synthetic offline');
  first.unmount();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(new Response('{broken', {headers: {'Content-Type': 'application/json'}})),
  );
  render(<Workspace />);
  expect(await screen.findByRole('alert')).toHaveTextContent('unreadable response');
  expect(screen.queryByLabelText('Gallery search')).not.toBeInTheDocument();
});

test('invalid successful API JSON reports an error instead of mounting a broken collection', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{}', {headers: {'Content-Type': 'application/json'}})),
  );
  render(<Workspace />);
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid reference collection');
  expect(screen.queryByLabelText('Gallery search')).not.toBeInTheDocument();
});
