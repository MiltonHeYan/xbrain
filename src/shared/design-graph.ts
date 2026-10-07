import type {Resource} from '../memory/model.js';
export interface GraphNode {
  id: string;
  label: string;
  type: 'resource' | 'domain' | 'feature' | 'style';
}
export interface GraphEdge {
  source: string;
  target: string;
  resourceId: string;
  evidence: string[];
  imageUrls: string[];
  hypothesis: boolean;
  confidence: string;
  confirmation: string | null;
}
export interface DesignGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  resources: Resource[];
  total: number;
  truncated: boolean;
}
/** Stable bounded projection, not inferred semantic similarity. No edges from stale analysis. */
export function designGraph(resources: Resource[]): DesignGraph {
  const selected = resources.slice(0, 30);
  const nodes: GraphNode[] = selected.map((r) => ({id: r.id, label: r.title, type: 'resource'}));
  const known = new Set(nodes.map((n) => n.id));
  const edges: GraphEdge[] = [];
  let truncated = resources.length > selected.length;
  for (const r of selected) {
    const d = r.design;
    if (d?.status !== 'analyzed') continue;
    const add = (
      type: GraphNode['type'],
      label: string,
      refs: string[],
      hypothesis = false,
      confidence = 'observed',
      confirmation: string | null = null,
    ) => {
      const id = JSON.stringify([type, label.trim().toLowerCase()]);
      if (!known.has(id)) {
        if (nodes.length >= 120) {
          truncated = true;
          return;
        }
        nodes.push({id, label, type});
        known.add(id);
      }
      const features = d.features.filter((f) => refs.includes(f.id));
      edges.push({
        source: r.id,
        target: id,
        resourceId: r.id,
        evidence: features.map((f) => f.evidence),
        imageUrls: [...new Set(features.map((f) => f.imageUrl))],
        hypothesis,
        confidence,
        confirmation,
      });
    };
    d.domains.forEach((x) => add('domain', x.label, x.featureIds));
    d.features.forEach((x) => add('feature', `${x.kind}: ${x.value}`, [x.id]));
    d.styles.forEach((x) =>
      add('style', x.label, x.featureIds, x.confirmation === null, x.confidence, x.confirmation),
    );
  }
  return {nodes, edges, resources: selected, total: resources.length, truncated};
}
