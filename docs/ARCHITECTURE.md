# Architecture

- `src/shared/types.ts` defines the normalized v1 model and edit types. Unknown
  JSON enters through `normalizeImport`, `normalizeLibrary`, and
  `normalizeBookmarkPatch`; provenance and merge semantics are shared by client,
  service, CLI and agent bridge.
- `src/server/` uses Node's built-in HTTP and filesystem modules. It serves only
  `dist/` on loopback, validates Host/Origin/fetch-site headers, limits requests,
  and stores JSON atomically with private permissions and a cross-process lock.
  Store reads preserve legacy bytes; writes normalize imports, never infer deletion.
- `src/client/` contains React state, selectors and a repository adapter. Components
  own the minimal cards, search and read-only native detail dialog. The adapter selects the
  local API or static-host browser storage and fails closed on load/save errors.
  Raw source strings are rendered as text. Memory Gallery previews load saved source images
  by default with a persisted browser toggle. Graph and legacy detail images require
  an explicit per-selection opt-in. Gallery pages/searches the full selected memory;
  Graph renders a bounded projection of that same source.
- `src/agent/bridge.ts` only sends enriched JSON to an explicit loopback origin,
  rejects redirects, and reads it back to report counts. The user's agent owns
  source authorization and model calls; the gallery never receives credentials.

## Build and entrypoints

`npm ci` installs locked dependencies. `npm start` runs the TypeScript compiler,
Vite's production build, then the Node service in the same process. Compilation
must finish before a socket is opened. No Vite development server is exposed.
Node needs no web framework, database, worker service or model SDK at runtime.
`npm run build` is useful for CLI-only workflows. Existing `.mjs` entrypoints and
`lib/` import paths remain small adapters to `.build/`; application logic lives
only in TypeScript, not two implementations.

The root is derived from module URLs, so the default `data/bookmarks.json` location
is independent of shell cwd and compiled output. Explicit `BOOKMARK_STORE` paths
still override it. The browser key and JSON version are intentionally unchanged.

## Contributing

Run `npm run typecheck`, `npm test`, and `npm run format:check` after changes.
Keep runtime payload validation even when types are strict. Add regressions at the
boundary that failed; do not replace real browser evidence with JSDOM results.
Do not include private stores or live connector responses in fixtures or PRs.

## Resource memory

- `src/memory/model.ts`: validated provider-neutral resource records, source-based
  stable identity, deterministic multilingual lexical candidate retrieval/citations.
- `src/memory/store.ts`: separate versioned resource file, tombstones and per-target
  sync receipts; private atomic replacement and a cross-process mutation lock.
- `src/memory/service.ts`: explicit local upsert/update/delete, tombstone-aware search,
  and selected-record synchronization. No implicit target, scheduling or network.
- `src/memory/provider.ts`: working personal file provider and trusted command
  JSON protocol. A vendor-specific remote adapter is not bundled. Adapter auth and
  vendor ID mapping belong outside the repository, in the user's chosen integration.
- `scripts/memory.mjs`: compiled CLI entrypoint, defaulting to a separate
  `data/resource-memory.json`. `capture --bookmarks` explicitly reads an existing
  gallery file but never writes it. Resource operations do not alter the running gallery.

See [MEMORY.md](MEMORY.md) for the protocol and failure boundaries. Sync receipts
record confirmed revisions, not remote health. A process failure can replay an
operation, so providers must be idempotent. The source store lock is held during
sync; there is no distributed transaction or automatic multi-writer conflict merge.


## Manual source refresh

`src/memory/source.ts` validates the independent `xstash.source.v1` command contract.
`pull.ts` performs bounded page fetching outside the mutation lock, then atomically
commits source hashes, pending distillation and continuation progress. Generations
reject stale concurrent responses. Only a completed fetch window advances the delta
checkpoint; absence never deletes. `ingestion-state.ts` validates optional progress
metadata in the existing resource-store format; older files without it remain readable.
The Agent supplies guarded `distill` payloads. Source content and local revision hashes
prevent stale refinement; pending records cannot be sent through memory-provider sync.
See SYNC_BOOKMARKS.md. No source vendor or scheduler is selected by this layer.
