import type {View} from '../../shared/types.js';
import {viewNames} from './Filters.js';
export function Sidebar({
  view,
  topic,
  counts,
  topics,
  onView,
  onTopic,
  onGuide,
  onExport,
  disabled,
  local,
}: {
  view: View;
  topic: string;
  counts: Record<View, number>;
  topics: [string, number][];
  onView: (v: View) => void;
  onTopic: (t: string) => void;
  onGuide: () => void;
  onExport: () => void;
  disabled: boolean;
  local: boolean;
}) {
  return (
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="xstash home">
        <span className="brand-mark">x</span>xstash<span className="brand-dot">.</span>
      </a>
      <p className="workspace">A place for things worth keeping.</p>
      <nav aria-label="Collection navigation">
        <p className="eyebrow">LIBRARY</p>
        {(Object.keys(viewNames) as View[]).map((v) => (
          <button
            key={v}
            className={'nav-item ' + (view === v && !topic ? 'active' : '')}
            aria-pressed={view === v && !topic}
            onClick={() => onView(v)}
          >
            <span>{v === 'all' ? '▦' : v === 'favorites' ? '☆' : '◇'}</span>
            {viewNames[v]}{' '}
            <b
              id={
                v === 'all'
                  ? 'total-count'
                  : v === 'favorites'
                    ? 'favorite-count'
                    : 'untagged-count'
              }
            >
              {counts[v]}
            </b>
          </button>
        ))}
        <div className="nav-divider" />
        <p className="eyebrow">
          YOUR TOPICS <span>{topics.length}</span>
        </p>
        <div id="topic-nav">
          {topics.map(([t, n]) => (
            <button
              key={t}
              className={'topic-button ' + (topic === t ? 'active' : '')}
              aria-pressed={topic === t}
              onClick={() => onTopic(t)}
            >
              <span>{t}</span>
              <b>{n}</b>
            </button>
          ))}
        </div>
      </nav>
      <div className="sidebar-bottom">
        <button className="agent-link" id="agent-guide" onClick={onGuide}>
          Set up your agent <span aria-hidden="true">↗</span>
        </button>
        <button id="export" className="export-link" disabled={disabled} onClick={onExport}>
          ⇩ <span>Export collection</span>
        </button>
        <div className="local-label">
          <span />
          <span>{local ? 'Saved on this computer' : 'Saved in this browser'}</span>
        </div>
      </div>
    </aside>
  );
}
