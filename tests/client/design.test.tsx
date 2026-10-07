import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {test, expect, vi} from 'vitest';
import {DesignGraph} from '../../src/client/DesignGraph.js';
import {designGraph} from '../../src/shared/design-graph.js';
import type {Resource} from '../../src/memory/model.js';
const resource: Resource = {
  id: 'r1',
  source: {provider: 'x', id: 'fixture', url: 'https://example.com/post'},
  title: 'Fictional reference',
  text: '',
  summary: '',
  purpose: '',
  useWhen: [],
  limitations: [],
  savedReason: null,
  updatedAt: '2026-10-07T00:00:00Z',
  design: {
    status: 'analyzed',
    images: [{url: 'https://example.com/image.png', observed: true}],
    domains: [{label: 'web-ui', featureIds: ['f']}],
    features: [
      {
        id: 'f',
        kind: 'spacing',
        value: 'wide margins',
        imageUrl: 'https://example.com/image.png',
        evidence: 'Visible empty margins frame the column.',
      },
    ],
    styles: [{label: 'minimal', featureIds: ['f'], confidence: 'low', confirmation: null}],
    analyzedAt: '2026-10-07T00:00:00Z',
    reason: 'Synthetic fixture.',
  },
};

test('graph selection by keyboard reveals evidence; images require opt-in, type filter and zoom work', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ok: true, json: async () => designGraph([resource])})),
  );
  const {container} = render(<DesignGraph />);
  const style = await screen.findByRole('button', {name: 'style: minimal'});
  fireEvent.keyDown(style, {key: 'Enter'});
  expect(screen.getByText('Hypothesis · low confidence')).toBeInTheDocument();
  expect(screen.getByText('Visible empty margins frame the column.')).toBeInTheDocument();
  expect(screen.getByRole('link', {name: 'Original post'})).toHaveAttribute(
    'href',
    'https://example.com/post',
  );
  expect(container.querySelectorAll('img')).toHaveLength(0);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('img')).toHaveAttribute('referrerpolicy', 'no-referrer');
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText(/Image unavailable/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Zoom in'}));
  expect(container.querySelector('svg')).toHaveAttribute('width', '1080');
  fireEvent.change(screen.getByRole('combobox', {name: 'Connection type'}), {
    target: {value: 'feature'},
  });
  expect(screen.queryByRole('button', {name: 'style: minimal'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Task or feature'), {target: {value: 'wide'}});
  fireEvent.click(screen.getByRole('button', {name: 'Search'}));
  await waitFor(() =>
    expect(fetch).toHaveBeenLastCalledWith('/api/design?q=wide&domain=', expect.anything()),
  );
});

test('missing store and empty search are explicit; source strings cannot execute markup', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ok: false, json: async () => ({error: 'Select a memory store.'})})),
  );
  render(<DesignGraph />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Select a memory store.');
});
