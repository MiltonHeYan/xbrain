# Testing / 验证说明

Use Node.js 22.12+ and `npm ci` to install the locked local toolchain.

```sh
npm run typecheck
npm test
npm start
```

`typecheck` checks shared models, all React components, server, store, CLI, bridge,
React tests and build configuration under strict TypeScript plus unchecked-index
checks. There is no `any` escape or unchecked JavaScript application implementation.
Small `.mjs` entrypoints only launch compiled code or the build/test tools.

`npm test` builds the app, runs all 53 pre-migration Node regressions through the
compatibility entrypoints, then runs React Testing Library/Vitest tests in JSDOM.
The original 25 DOM scenarios are retained as component behavior tests, with
additional migration regressions. These exercise React itself instead of extracting
functions from an old JavaScript file. JSDOM remains a simulation, not pixel QA.

```sh
npm run test:core  # after npm run build
npm run test:ui
node scripts/test-ui.mjs  # compatibility alias
```

All committed fixtures are synthetic. HTTP tests start `PORT=0` with independent
private temporary stores and clean up their processes/files. Never point test
suites at the user's active library.

## Browser and fresh-agent acceptance

Use an isolated loopback server with an explicit private `BOOKMARK_STORE` and
synthetic records for screenshots. Verify desktop and mobile-sized layouts,
search/topic/favorite filtering, list/grid, no-result recovery, keyboard focus,
import errors and duplicates, detail cancel/save, export/download, refresh and
sample/library separation. Images must remain absent until session-only opt-in.

Follow [CLEAN_AGENT_ACCEPTANCE.md](CLEAN_AGENT_ACCEPTANCE.md) in a fresh agent
context against an isolated server for authorized live-import acceptance. Compare
first import, read-back, annotations and duplicate counts. Keep live input files
outside the repository. Do not report simulated passes as browser or live-agent
success. Record any unavailable check explicitly.

## Data migration

The v1 JSON envelope and browser storage key `commonplace.library.v1` are unchanged.
Back up the user's library (private permissions), verify its hash, and test against
a private COPY. Source updates and reads must not rewrite the original store.
Default datastore paths still resolve from the project root, not the shell cwd or
`.build/`. No migration script resets or upgrades the data schema.


## Design-reference acceptance

`tests/design.test.mjs` uses only fictional records to check evidence validation,
revision conflicts, stable IDs, cross-domain retrieval, stale-analysis exclusion,
optional personal file-provider round trips, graph bounds and local HTTP origin
checks. `tests/client/design.test.tsx` covers keyboard selection, per-selection
image opt-in, broken-image feedback, filtering and zoom.

For an isolated preview, choose a new private temporary directory and an unused
loopback port. Import `examples/design-resources.json` into that directory using
`memory.mjs put --store FILE`, then start with explicit `MEMORY_STORE`,
`BOOKMARK_STORE` (a different temporary path), and `PORT`. Open `/?view=graph`.
The fixture's image URLs and visual claims are fictional; this tests the data
workflow and UI, not real model vision accuracy. Never point this demo at an
existing personal store. Verify a shared style reveals both source-specific
explanations, domain filtering excludes other categories, missing-image resources
have no style edges, images stay unloaded until selected, and mobile page width
does not overflow (the graph itself scrolls horizontally).
