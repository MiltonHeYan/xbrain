import {fireEvent, render, screen} from '@testing-library/react';
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

vi.mock('../../src/client/graph/NetworkCanvas.js', () => ({
  COLORS: {resource: '#bbb', domain: '#ccc', feature: '#ddd', style: '#eee'},
  NetworkCanvas: () => <canvas aria-label="Reference network" />,
}));

test('node browser reveals original evidence; images remain opt-in and filters compose without refetching', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ok: true, json: async () => designGraph([resource])})),
  );
  const {container} = render(<DesignGraph />);
  fireEvent.click(await screen.findByRole('button', {name: 'Browse nodes'}));
  fireEvent.click(screen.getByRole('button', {name: 'style: minimal'}));
  expect(screen.getByText('Hypothesis · low confidence')).toBeInTheDocument();
  expect(screen.getByText('Visible empty margins frame the column.')).toBeInTheDocument();
  expect(screen.getByRole('link', {name: /Original post/})).toHaveAttribute(
    'href',
    'https://example.com/post',
  );
  expect(container.querySelectorAll('img')).toHaveLength(0);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('img')).toHaveAttribute('referrerpolicy', 'no-referrer');
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText(/Image unavailable/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Close evidence'}));
  fireEvent.change(screen.getByRole('textbox', {name: 'Search references and features'}), {
    target: {value: 'wide margins'},
  });
  fireEvent.click(screen.getByRole('button', {name: /Visual features/}));
  fireEvent.click(screen.getByRole('button', {name: 'Browse nodes'}));
  expect(screen.getByRole('button', {name: 'feature: spacing: wide margins'})).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'style: minimal'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', {name: 'Design domain'}), {
    target: {value: 'hardware'},
  });
  expect(screen.getByText('No matching nodes.')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('missing store and empty search are explicit; source strings cannot execute markup', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ok: false, json: async () => ({error: 'Select a memory store.'})})),
  );
  render(<DesignGraph />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Select a memory store.');
});

test('a JSON 404 preserves the missing-reference error instead of claiming the API is absent', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({error: 'Reference not found in this collection.'}), {
        status: 404,
        headers: {'Content-Type': 'application/json'},
      }),
    ),
  );
  render(<DesignGraph focusId="deleted-synthetic-reference" />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Reference not found in this collection.',
  );
  expect(
    screen.queryByText('Graph requires the local server with MEMORY_STORE configured.'),
  ).not.toBeInTheDocument();
});
