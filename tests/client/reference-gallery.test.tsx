import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {test, expect, vi} from 'vitest';
import {ReferenceGallery} from '../../src/client/ReferenceGallery.js';
import type {Resource} from '../../src/memory/model.js';
const records: Resource[] = Array.from({length: 150}, (_, i) => ({
  id: `fixture-${i}`,
  source: {provider: 'x', id: String(i), url: `https://example.com/${i}`},
  title: `Fictional ${i}`,
  text: i === 149 ? 'uniqueneedle149' : 'Fictional',
  summary: '',
  purpose: '',
  useWhen: [],
  limitations: [],
  savedReason: null,
  updatedAt: '2026-10-07T00:00:00Z',
}));
const first = {
  resources: records.slice(0, 100),
  total: 150,
  matched: 150,
  offset: 0,
  hasMore: true,
};
const response = (data: unknown) =>
  new Response(JSON.stringify(data), {headers: {'Content-Type': 'application/json'}});
test('Gallery loads every page and searches beyond the graph limit; overflow cards open by stable ID', async () => {
  const fetch = vi.fn(async (url: string) =>
    response(
      url.includes('offset=100')
        ? {...first, resources: records.slice(100), offset: 100, hasMore: false}
        : {...first, resources: [records[149]], matched: 1, hasMore: false},
    ),
  );
  vi.stubGlobal('fetch', fetch);
  const onGraph = vi.fn();
  const {container} = render(<ReferenceGallery data={first} onGraph={onGraph} />);
  expect(container.querySelectorAll('[data-resource-id]')).toHaveLength(100);
  fireEvent.click(screen.getByRole('button', {name: 'Load more references'}));
  await screen.findByText('Fictional 149');
  expect(container.querySelectorAll('[data-resource-id]')).toHaveLength(150);
  expect(screen.queryByRole('button', {name: 'Load more references'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'uniqueneedle149'}});
  await waitFor(() => expect(container.querySelectorAll('[data-resource-id]')).toHaveLength(1));
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/references?q=uniqueneedle149&offset=0',
    expect.anything(),
  );
  fireEvent.click(screen.getByRole('button', {name: 'View in Graph →'}));
  expect(onGraph).toHaveBeenCalledWith('fixture-149');
  fireEvent.change(screen.getByRole('searchbox'), {target: {value: ''}});
  await waitFor(() => expect(container.querySelectorAll('[data-resource-id]')).toHaveLength(100));
});
test('late search responses cannot replace newer results and failed queries remain visible', async () => {
  let resolveSlow!: (r: Response) => void;
  const slow = new Promise<Response>((r) => {
    resolveSlow = r;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      url.includes('slow')
        ? slow
        : Promise.resolve(
            response({...first, resources: [records[149]], matched: 1, hasMore: false}),
          ),
    ),
  );
  const {container} = render(<ReferenceGallery data={first} onGraph={() => {}} />);
  fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'slow'}});
  fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'newer'}});
  await waitFor(() => expect(container.querySelectorAll('[data-resource-id]')).toHaveLength(1));
  await act(async () =>
    resolveSlow(response({...first, resources: [records[0]], matched: 1, hasMore: false})),
  );
  expect(screen.getByText('Fictional 149')).toBeInTheDocument();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({error: 'Synthetic unavailable'}), {status: 500}),
      ),
  );
  fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'error'}});
  expect(await screen.findByRole('alert')).toHaveTextContent('Synthetic unavailable');
});
