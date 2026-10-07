import {seedLayout, settleLayout} from './layout.js';
import type {GraphNode, GraphEdge} from '../../shared/design-graph.js';
self.onmessage = (event: MessageEvent<{nodes: GraphNode[]; edges: GraphEdge[]}>) => {
  const nodes = settleLayout(seedLayout(event.data.nodes, event.data.edges), event.data.edges);
  const positions = new Float32Array(nodes.flatMap((n) => [n.x, n.y]));
  self.postMessage({positions}, {transfer: [positions.buffer]});
};
