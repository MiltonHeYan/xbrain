import {useEffect, useRef, useState} from 'react';
import type {DesignGraph, GraphNode} from '../../shared/design-graph.js';
import {seedLayout} from './layout.js';
import type {Particle} from './layout.js';

export const COLORS: Record<GraphNode['type'], string> = {
  resource: '#b5bac4',
  domain: '#c495f4',
  feature: '#70b9bd',
  style: '#dda86d',
};
export interface NetworkControls {
  zoom: (factor: number) => void;
  fit: () => void;
  reset: () => void;
}
export function NetworkCanvas({
  data,
  selected,
  highlight,
  onSelect,
  controls,
}: {
  data: DesignGraph;
  selected: string;
  highlight: Set<string> | null;
  onSelect: (id: string) => void;
  controls: React.RefObject<NetworkControls | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef({selected, highlight, onSelect});
  const redraw = useRef<() => void>(() => {});
  const [state, setState] = useState('Laying out references…');
  const [scale, setScale] = useState(100);
  useEffect(() => {
    latest.current = {selected, highlight, onSelect};
    redraw.current();
  }, [selected, highlight, onSelect]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) {
      setState('Canvas unavailable. Use Browse nodes below.');
      return;
    }
    let nodes = seedLayout(data.nodes, data.edges);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const neighbors = new Map(nodes.map((n) => [n.id, new Set([n.id])]));
    for (const e of data.edges) {
      neighbors.get(e.source)?.add(e.target);
      neighbors.get(e.target)?.add(e.source);
    }
    let width = 1,
      height = 1,
      k = 1,
      tx = 0,
      ty = 0,
      frame = 0,
      hover = '',
      disposed = false,
      ready = false;
    let drag: {
      id: string;
      x: number;
      y: number;
      startX: number;
      startY: number;
      moved: boolean;
      pointer: number;
    } | null = null;
    const screen = (n: Particle) => ({x: n.x * k + tx, y: n.y * k + ty});
    const draw = () => {
      frame = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const {selected, highlight} = latest.current;
      const focus = selected || hover;
      const neighborhood = neighbors.get(focus);
      const lit = (id: string) =>
        (!highlight || highlight.has(id)) && (!neighborhood || neighborhood.has(id));
      for (const e of data.edges) {
        const a = byId.get(e.source),
          b = byId.get(e.target);
        if (!a || !b) continue;
        const p = screen(a),
          q = screen(b);
        const incident = e.source === focus || e.target === focus;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = incident
          ? 'rgba(224,228,237,.58)'
          : focus || highlight
            ? 'rgba(150,163,185,.045)'
            : 'rgba(150,163,185,.17)';
        ctx.lineWidth = incident ? 1 : 0.65;
        ctx.setLineDash(e.hypothesis ? [2, 4] : []);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const n of nodes) {
        const p = screen(n);
        const r = n.radius * Math.sqrt(k);
        ctx.globalAlpha = lit(n.id) ? 1 : 0.17;
        ctx.fillStyle = COLORS[n.type];
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (n.id === focus || highlight?.has(n.id)) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = n.id === selected ? '#fff' : COLORS[n.type];
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      const occupied: {x: number; y: number; w: number}[] = [];
      const labels = [...nodes].sort(
        (a, b) => Number(b.id === focus) - Number(a.id === focus) || b.degree - a.degree,
      );
      let shown = 0;
      for (const n of labels) {
        if (n.id !== focus && !highlight?.has(n.id)) continue;
        if (shown >= 8 && n.id !== focus) continue;
        const p = screen(n);
        const label = n.label.length > 45 ? n.label.slice(0, 44) + '…' : n.label;
        ctx.font = '11px ui-monospace, monospace';
        const w = ctx.measureText(label).width;
        const x = Math.max(8, Math.min(width - w - 8, p.x + n.radius * Math.sqrt(k) + 8)),
          y = Math.max(18, Math.min(height - 16, p.y));
        if (
          n.id !== focus &&
          occupied.some((b) => Math.abs(b.y - y) < 17 && b.x < x + w && x < b.x + b.w)
        )
          continue;
        ctx.fillStyle = 'rgba(16,17,20,.9)';
        ctx.fillRect(x - 3, y - 12, w + 6, 17);
        ctx.fillStyle = '#e0e2e8';
        ctx.fillText(label, x, y);
        occupied.push({x, y, w});
        shown++;
      }
    };
    const schedule = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(draw);
    };
    redraw.current = schedule;
    const fit = () => {
      if (!nodes.length) return;
      const xs = nodes.map((n) => n.x),
        ys = nodes.map((n) => n.y);
      const minX = Math.min(...xs) - 28,
        maxX = Math.max(...xs) + 28,
        minY = Math.min(...ys) - 28,
        maxY = Math.max(...ys) + 28;
      k = Math.max(
        0.25,
        Math.min(1.65, (width - 110) / (maxX - minX), (height - 200) / (maxY - minY)),
      );
      tx = width / 2 - ((minX + maxX) * k) / 2;
      ty = height / 2 + 10 - ((minY + maxY) * k) / 2;
      setScale(Math.round(k * 100));
      schedule();
    };
    const zoomAt = (factor: number, x = width / 2, y = height / 2) => {
      const next = Math.max(0.2, Math.min(5, k * factor));
      tx = x - ((x - tx) * next) / k;
      ty = y - ((y - ty) * next) / k;
      k = next;
      setScale(Math.round(k * 100));
      schedule();
    };
    controls.current = {zoom: zoomAt, fit, reset: () => zoomAt(1 / k)};
    const resize = () => {
      const rect = el.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      fit();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const point = (e: PointerEvent | WheelEvent) => {
      const b = el.getBoundingClientRect();
      return {x: e.clientX - b.left, y: e.clientY - b.top};
    };
    const hit = (x: number, y: number) => {
      let result: Particle | undefined,
        dist = Infinity;
      for (const n of nodes) {
        const p = screen(n),
          d = Math.hypot(p.x - x, p.y - y);
        if (d < Math.max(12, n.radius * Math.sqrt(k) + 5) && d < dist) {
          result = n;
          dist = d;
        }
      }
      return result;
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || drag) return;
      const p = point(e),
        n = hit(p.x, p.y);
      drag = {
        id: n?.id ?? '',
        x: p.x,
        y: p.y,
        startX: p.x,
        startY: p.y,
        moved: false,
        pointer: e.pointerId,
      };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      const p = point(e);
      if (drag && drag.pointer === e.pointerId) {
        if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > 4) drag.moved = true;
        if (drag.moved) {
          const n = byId.get(drag.id);
          if (n) {
            n.x += (p.x - drag.x) / k;
            n.y += (p.y - drag.y) / k;
          } else {
            tx += p.x - drag.x;
            ty += p.y - drag.y;
          }
          drag.x = p.x;
          drag.y = p.y;
          schedule();
        }
      } else if (!drag) {
        hover = hit(p.x, p.y)?.id ?? '';
        el.style.cursor = hover ? 'pointer' : 'grab';
        schedule();
      }
    };
    const up = (e: PointerEvent) => {
      if (!drag || drag.pointer !== e.pointerId) return;
      if (!drag.moved && e.type !== 'pointercancel') latest.current.onSelect(drag.id);
      drag = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
      schedule();
    };
    const leave = () => {
      if (!drag) {
        hover = '';
        schedule();
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = point(e);
      zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latest.current.onSelect('');
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomAt(1.2);
      }
      if (e.key === '-') {
        e.preventDefault();
        zoomAt(1 / 1.2);
      }
      if (e.key === '0') {
        e.preventDefault();
        fit();
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('wheel', wheel, {passive: false});
    el.addEventListener('keydown', key);
    let worker: Worker | undefined;
    const failed = () => {
      if (!disposed) {
        setState('Layout unavailable. Showing an initial distribution; use Browse nodes.');
        ready = true;
        fit();
      }
    };
    try {
      worker = new Worker(new URL('./layout.worker.ts', import.meta.url), {type: 'module'});
      worker.onmessage = (event: MessageEvent<{positions: Float32Array}>) => {
        nodes.forEach((n, i) => {
          n.x = event.data.positions[i * 2]!;
          n.y = event.data.positions[i * 2 + 1]!;
        });
        ready = true;
        setState('');
        fit();
      };
      worker.onerror = failed;
      worker.postMessage({nodes: data.nodes, edges: data.edges});
    } catch {
      failed();
    }
    const timeout = window.setTimeout(() => {
      if (!ready) {
        worker?.terminate();
        failed();
      }
    }, 10000);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      observer.disconnect();
      worker?.terminate();
      cancelAnimationFrame(frame);
      controls.current = null;
      redraw.current = () => {};
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('keydown', key);
    };
  }, [data, controls]);
  return (
    <>
      <canvas
        ref={canvas}
        className="network-canvas"
        tabIndex={0}
        aria-label="Reference network. Drag to pan, scroll to zoom. Use Browse nodes for keyboard selection."
      />
      <span className="network-status" role="status">
        {state}
      </span>
      <output className="network-scale" aria-label="Zoom level">
        {scale}%
      </output>
    </>
  );
}
