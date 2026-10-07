# Design references and evidence

The host Agent views authorized images and submits observations. xrecall validates structure and evidence links; it cannot prove an Agent actually viewed an image or that a style interpretation is correct. No image download, model call, embedding service or new account is required by the code.

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

This example is fictional. Do not use its claims for a real image. Domains: `web-ui`, `app-ui`, `interior`, `graphic`, `other` (multiple allowed). Feature kinds: `layout`, `spacing`, `typography`, `color`, `material`, `shape`. Every domain/style points to existing features; every feature points to an image explicitly marked observed. The evidence must describe visible details, not repeat a style name. Multiple competing styles are allowed; confidence is `low`, `medium` or `high`. A non-null `confirmation` records the user's actual confirmation of that label for this reference, not a universal preference or permission to act.

If unavailable, submit `status: "unanalyzed"`, `images: [{"url": "https://example.com/unavailable.png", "observed": false}]`, empty domains/features/styles, `analyzedAt: null`, and a concrete reason. With no image URL, use `images: []`. Missing `design` on older resources also means not visually analyzed. No invented labels are accepted for `unanalyzed`.

Source text/URL changes through capture, pull or an update retaining the same analysis mark existing analysis `stale`. Old evidence is preserved for audit, excluded from visual filters and graph edges. Images changing at the same URL cannot be detected automatically; re-inspect when freshness matters. Explicit replacement analysis must be grounded in the new image. Local tombstones, atomic writes, permissions and IDs remain unchanged; no migration or original-library write occurs.

## Search and graph

Search returns the resource (including original post, image URLs, features, evidence and style uncertainty) and original citation. Filters combine with AND; a feature matches its dimension or value, styles match a case-insensitive substring, domain is an exact enum. Query terms are lexical, with visual labels added only for analyzed records. Empty query is permitted when a filter is supplied. Lack of a visual match does not establish lack of relevant references.

```sh
MEMORY_STORE=/private/design-memory.json npm start
```

Open `http://127.0.0.1:4317/?view=graph`. Use an unused `PORT` if needed. This opt-in, read-only view uses the selected resource memory, not the gallery library. No `MEMORY_STORE` yields an explicit setup message. It never contacts remote memory. Static-only hosting cannot load this API. The separate gallery works as before.

Graph nodes are resources, domains, features and styles. Shared normalized labels share nodes; sources remain separate with per-edge evidence, confidence and confirmation. Dashed edges are style hypotheses; a confirmed label keeps its confirmation text. Unanalyzed/stale resources remain visible with no fabricated edges. Select by click or keyboard Enter/Space; scroll to pan, use zoom buttons, and filter by domain or connection type. The view caps at 30 matching resources and 120 nodes, discloses truncation and asks for a narrower search. It is not a million-node force simulation. Original images load only after a per-selection opt-in, without referrer; source hosts may still see requests. Broken/expired image URLs are not recovered or proxied.

## Reference implementation

Interaction research: [CoreSpeed Lore](https://github.com/corespeed-io/lore), [GraphView.tsx](https://github.com/corespeed-io/lore/blob/main/src/modules/graph/browser/GraphView.tsx), [WorkerCanvasGraph.tsx](https://github.com/corespeed-io/lore/blob/main/src/modules/graph/browser/WorkerCanvasGraph.tsx), under its [MIT license](https://github.com/corespeed-io/lore/blob/main/LICENSE). We inspected selection, filtering and zoom patterns. This bounded SVG implementation is independently written; no Lore code or assets are copied and no Lore dependency is installed.
