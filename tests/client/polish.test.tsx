import {createRef} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {Filters} from '../../src/client/components/Filters.js';
import {Sidebar} from '../../src/client/components/Sidebar.js';
const topics: [string, number][] = Array.from({length: 12}, (_, i) => [`Topic ${i + 1}`, 1]);
function filters(overrides = {}) {
  return {
    query: '',
    setQuery: vi.fn(),
    sort: 'newest' as const,
    setSort: vi.fn(),
    view: 'all' as const,
    setView: vi.fn(),
    topic: '',
    setTopic: vi.fn(),
    topics,
    layout: 'grid' as const,
    setLayout: vi.fn(),
    count: 12,
    onExport: vi.fn(),
    disabled: false,
    searchRef: createRef<HTMLInputElement>(),
    ...overrides,
  };
}
afterEach(cleanup);
describe('Minimal gallery navigation', () => {
  it('labels the layout controls as a semantic group', () => {
    render(<Filters {...filters()} />);
    expect(screen.getByRole('group', {name: 'Layout'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Grid view'})).toHaveAttribute('aria-pressed', 'true');
  });
  it('keeps a selected topic outside the initial row visible', () => {
    render(<Filters {...filters({topic: 'Topic 12'})} />);
    expect(screen.getByRole('button', {name: 'Topic 12'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox', {name: 'Choose any topic'})).toHaveValue('Topic 12');
  });
  it('offers all topics when exactly six topics exceed the five default chips', () => {
    render(<Filters {...filters({topics: topics.slice(0, 6)})} />);
    expect(screen.getByRole('combobox', {name: 'Choose any topic'})).toBeVisible();
    expect(screen.getByRole('option', {name: 'Topic 6 (1)'})).toBeInTheDocument();
  });
  it('offers one reset that clears search, topic and collection view', () => {
    const props = filters({query: 'design', topic: 'Topic 12', view: 'favorites' as const});
    render(<Filters {...props} />);
    fireEvent.click(screen.getByRole('button', {name: 'Clear filters'}));
    expect(props.setQuery).toHaveBeenCalledWith('');
    expect(props.setTopic).toHaveBeenCalledWith('');
    expect(props.setView).toHaveBeenCalledWith('all');
  });
  it('omits the reset when nothing is filtered', () => {
    render(<Filters {...filters()} />);
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });
  it('keeps every topic in navigation and the agent link outside its scrolling area', () => {
    render(
      <Sidebar
        view="all"
        topic=""
        counts={{all: 12, favorites: 0, untagged: 0}}
        topics={topics}
        onView={vi.fn()}
        onTopic={vi.fn()}
        onGuide={vi.fn()}
        onExport={vi.fn()}
        disabled={false}
        local
      />,
    );
    const nav = screen.getByRole('navigation', {name: 'Collection navigation'});
    expect(nav.querySelectorAll('.topic-button')).toHaveLength(12);
    expect(nav).not.toContainElement(screen.getByRole('button', {name: /Set up your agent/}));
  });
});
