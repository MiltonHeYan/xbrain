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
  own cards, native dialogs, navigation, filters and forms. The adapter selects the
  local API or static-host browser storage and fails closed on load/save errors.
  Raw source strings are rendered as text. External images require session consent.
- `src/agent/bridge.ts` only sends enriched JSON to an explicit loopback origin,
  rejects redirects, and reads it back to report counts. The user's agent owns
  CoreSpeed authorization and model calls; the gallery never receives credentials.

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
