# Design references and evidence

The host Agent views authorized images and submits observations. Xbrain validates structure and evidence links; it cannot prove an Agent actually viewed an image or that a style interpretation is correct. No image download, model call, embedding service or new account is required by the code.

## Capture → inspect → analyze → retrieve

After `npm ci` and `npm run build`, save a resource with the existing `put` command (see [MEMORY.md](MEMORY.md)). Source identity is unchanged: provider + original ID. Images are URLs attached to that resource, not new duplicate resources. Gallery capture retains up to 12 supplied HTTPS image URLs as unanalyzed pointers; missing media never deletes prior evidence. If the connector only supplies text, the Agent must obtain the original image through authorized tools before analysis.

```sh
node scripts/memory.mjs put /private/resource.json --store /private/design-memory.json
node scripts/memory.mjs inspect RESOURCE_ID --store /private/design-memory.json
node scripts/memory.mjs analyze /private/analysis.json --store /private/design-memory.json
node scripts/memory.mjs search "generous spacing" --domain web-ui --store /private/design-memory.json
node scripts/memory.mjs search "" --domain interior --feature material --style Japandi --store /private/design-memory.json
```

`inspect` returns `{resource, resourceRevision}`. Copy its ID and revision into the analysis envelope below. Concurrent or stale writes fail without modifying the file. `analyze` only changes visual analysis, preserving original source/text, save reason and text distillation. Updates change the resource revision; an explicitly selected memory provider can sync it normally. It does not clear pending text distillation.

```json
{
  "id": "RESOURCE_ID",
  "resourceRevision": "REVISION_FROM_INSPECT",
  "design": {
    "status": "analyzed",
    "images": [{"url": "https://example.com/reference.png", "observed": true}],
    "features": [{"id": "f1", "kind": "spacing", "value": "generous whitespace", "imageUrl": "https://example.com/reference.png", "evidence": "Wide empty margins surround a narrow centered content column."}],
    "domains": [{"label": "web-ui", "featureIds": ["f1"]}],
    "styles": [{"label": "minimal editorial", "featureIds": ["f1"], "confidence": "medium", "confirmation": null}],
    "analyzedAt": "2026-10-07T12:00:00Z",
    "reason": "Observed the supplied reference; style remains a hypothesis."
  }
}
```

This example is fictional. Do not use its claims for a real image. Domains: `web-ui`, `app-ui`, `hardware`, `architecture`, `interior`, `graphic`, `other` (multiple allowed). Feature kinds: `layout`, `spacing`, `typography`, `color`, `material`, `shape`. Every domain/style points to existing features; every feature points to an image explicitly marked observed. The evidence must describe visible details, not repeat a style name. Multiple competing styles are allowed; confidence is `low`, `medium` or `high`. A non-null `confirmation` records the user's actual confirmation of that label for this reference, not a universal preference or permission to act.

If unavailable, submit `status: "unanalyzed"`, `images: [{"url": "https://example.com/unavailable.png", "observed": false}]`, empty domains/features/styles, `analyzedAt: null`, and a concrete reason. With no image URL, use `images: []`. Missing `design` on older resources also means not visually analyzed. No invented labels are accepted for `unanalyzed`.

Source text/URL changes through capture, pull or an update retaining the same analysis mark existing analysis `stale`. Old evidence is preserved for audit, excluded from visual filters and graph edges. Images changing at the same URL cannot be detected automatically; re-inspect when freshness matters. Explicit replacement analysis must be grounded in the new image. Local tombstones, atomic writes, permissions and IDs remain unchanged; no migration or original-library write occurs.

## Search and graph

Search returns the resource (including original post, image URLs, features, evidence and style uncertainty) and original citation. Filters combine with AND; a feature matches its dimension or value, styles match a case-insensitive substring, domain is an exact enum. Query terms are lexical, with visual labels added only for analyzed records. Empty query is permitted when a filter is supplied. Lack of a visual match does not establish lack of relevant references.

```sh
MEMORY_STORE=/private/design-memory.json npm start
```

Open `http://127.0.0.1:4317/?view=graph`. Use an unused `PORT` if needed. When MEMORY_STORE is configured, Gallery and Graph share the same read-only resource collection and stable IDs. Gallery uses `/api/references` to page through and search the entire collection. Its search matches every whitespace-separated query fragment as a case-insensitive substring in title, original text or summary; partial words work. Typing waits 300ms before a request, while paging is immediate. Clearing or leaving Gallery cancels pending queries; Graph uses the bounded `/api/design` projection. No `MEMORY_STORE` yields an explicit setup message. It never contacts remote memory. Static-only hosting cannot load this API. Without a selected memory, the legacy gallery remains available.

Graph nodes are resources, domains, features and styles. Shared normalized labels share nodes; sources remain separate with per-edge evidence, confidence and confirmation. Dashed edges are style hypotheses. Unanalyzed/stale resources remain visible without invented edges. The read-only view caps at 100 references and 300 nodes and discloses truncation. Selecting a Gallery record outside the default projection includes that exact stable ID in the next graph projection; it does not change the collection or raise the graph limit.

The network uses a Web Worker for bounded force layout, then a device-pixel-ratio-aware Canvas renderer. Node area varies with unique degree; color indicates node type and is also named in the legend and evidence panel. Search matches local source text, summaries and visual labels; it highlights matches without removing their context. Domain and legend filters combine with search. This remains lexical matching, not semantic search. Layout distances do not encode confidence or semantic similarity.

Hover/click highlights a node and its neighbors. Labels appear only for hover, selection and a bounded set of search matches. Drag the background to pan, drag a point to reposition it locally, scroll to zoom, or use zoom/fit/fullscreen controls. Node positions are temporary and never write the store. Keyboard users can choose from Browse nodes; the focused canvas supports +/−, 0 to fit and Escape to clear selection. The layout worker is terminated on unmount; worker failure is disclosed with a usable initial distribution and node list. Gallery previews load saved source image URLs by default, with a remembered Show source images toggle and no referrer; Graph evidence images remain opt-in. Expired URLs are not recovered or proxied.

## Reference implementation and attribution

Inspected Lore at commit `9c6f2abeaab1fd2dc876d6910a2a8aae809f4159`:

- `src/modules/graph/browser/GraphView.tsx`: search/legend highlight composition, floating controls and selected-node preview.
- `WorkerCanvasGraph.tsx`: DPR-aware Canvas rendering, low-contrast links, neighbor emphasis, sparse collision-aware labels, pan/zoom/fit and hit testing.
- `graph-canvas.worker.ts`: D3 link, charge, collision and gravity forces; transferable position arrays and bounded drag physics.
- `rendering/centrality.ts`: unique-degree node size and hub calculation.
- `legend.ts`: named category encoding and legend filtering.

`src/client/graph/centrality.ts` is copied from Lore, copyright (c) 2024–2026 CoreSpeed, under the MIT license reproduced in `third_party/lore-LICENSE`. The phyllotaxis initialization and interaction design are adapted from the same source. Other renderer and layout code is independently implemented for Xbrain's maximum 300 nodes. The worker uses a bounded pairwise spring/repulsion/collision solver rather than importing Lore's D3 dependency and large-graph local-particle subsystem. Drag repositions the chosen node without reheating neighbors. The canvas is dark as requested; the inspected current Lore renderer uses light-surface link colors. No CoreSpeed sidebar, branding, remote service, fabricated nodes or inferred relationship data are included.

Source: https://github.com/corespeed-io/lore/tree/9c6f2abeaab1fd2dc876d6910a2a8aae809f4159/src/modules/graph/browser

## Xbrain presentation

The product and GitHub repository are named Xbrain; existing persistence identifiers remain unchanged. Disconnected references are spaced around the observed network after force settling so they remain visible without shrinking the useful graph. Placement and distance are not evidence of similarity. Selecting a node reserves space for a light evidence panel on wide screens; compact screens use an overlay. Observation notes are collapsible, source links and confidence remain inspectable, and Graph evidence images still require opt-in.
