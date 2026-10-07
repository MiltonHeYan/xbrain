import {graphNodeCentrality} from './centrality.js';
import type {GraphNode, GraphEdge} from '../../shared/design-graph.js';

export interface Particle extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  degree: number;
}
// Lore's degree encoding and phyllotaxis seed; bounded spring/charge solver for <=300 nodes.
// Provenance and MIT notice: third_party/lore-LICENSE and docs/DESIGN.md.
export function seedLayout(nodes: GraphNode[], edges: GraphEdge[]): Particle[] {
  const metrics = graphNodeCentrality(nodes, edges);
  const angle = Math.PI * (3 - Math.sqrt(5));
  return nodes.map((n, i) => ({
    ...n,
    ...metrics.get(n.id)!,
    x: Math.cos(i * angle) * 28 * Math.sqrt(i + 1),
    y: Math.sin(i * angle) * 28 * Math.sqrt(i + 1),
    vx: 0,
    vy: 0,
  }));
}
export function settleLayout(nodes: Particle[], edges: GraphEdge[], iterations = 240): Particle[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (let tick = 0; tick < iterations; tick++) {
    const cooling = 1 - tick / iterations;
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!,
          b = nodes[j]!;
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const distance = Math.max(0.1, Math.hypot(dx, dy));
        const gap = a.radius + b.radius + 18;
        const push = (1800 / (distance * distance) + Math.max(0, gap - distance) * 0.12) * cooling;
        a.vx -= (dx / distance) * push;
        a.vy -= (dy / distance) * push;
        b.vx += (dx / distance) * push;
        b.vy += (dy / distance) * push;
      }
    for (const e of edges) {
      const a = byId.get(e.source),
        b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.max(1, Math.hypot(dx, dy));
      const force = ((d - 84) * 0.024 * cooling) / Math.sqrt(Math.min(a.degree, b.degree) || 1);
      a.vx += (dx / d) * force;
      a.vy += (dy / d) * force;
      b.vx -= (dx / d) * force;
      b.vy -= (dy / d) * force;
    }
    for (const n of nodes) {
      n.vx = (n.vx - n.x * 0.0008 * cooling) * 0.7;
      n.vy = (n.vy - n.y * 0.0008 * cooling) * 0.7;
      n.x += n.vx;
      n.y += n.vy;
    }
  }
  // Keep unreviewed, disconnected references visible near the real graph without
  // letting a few isolated points shrink the entire connected network on fit.
  const connected = nodes.filter((n) => n.degree > 0);
  if (connected.length) {
    const spreadX = Math.max(120, ...connected.map((n) => Math.abs(n.x))) + 75;
    const spreadY = Math.max(120, ...connected.map((n) => Math.abs(n.y))) + 75;
    const isolated = nodes.filter((n) => !n.degree);
    isolated.forEach((n, i) => {
      const angle = (i / Math.max(1, isolated.length)) * Math.PI * 2 + 0.35;
      n.x = Math.cos(angle) * spreadX;
      n.y = Math.sin(angle) * spreadY;
    });
  }
  for (const n of nodes) n.x *= 1.3;
  return nodes;
}
