# TypeScript / React migration validation

Validation uses synthetic automated fixtures and separate local stores. It never
reuses the user's active library as a writable test fixture.

- Strict TypeScript checks cover shared models/import validation, React components,
  the Node service/store/CLI, agent bridge, React tests and build configuration.
- Vite production build passes. The Node service serves the generated client on
  the same loopback origin as the API.
- 55 Node regressions pass: all 53 existing tests plus v1 byte-preserving read /
  export-restore compatibility and production bundle/source-exposure checks.
- 31 React Testing Library tests pass: all 25 former DOM scenarios ported to actual
  components, plus topic/untagged filters, sorting/layout, inert source markup,
  keyboard focus, Escape cancel and malformed API response handling.
- A separate fresh agent, given only the root Skill, a built checkout, an existing
  authorized CoreSpeed connection and an isolated empty endpoint, fetched five
  real records. First import added five; read-back and Chinese summary/tag matches
  were 5/5. A repeat added zero; API and stored records matched. IDs remained
  strings and provenance remained declared agent provenance. Coverage is partial.
- The active user's v1 library was privately backed up and its exact bytes remained
  unchanged throughout migration and tests. No live records are in this report,
  repository, fixtures or screenshots.

## Outstanding browser acceptance

Real desktop/mobile pixel QA has not passed yet. The supported browser-control
transport returned `Transport closed` in the main session. A fresh independent
browser connection responded, but opening the isolated loopback preview returned
`net::ERR_BLOCKED_BY_CLIENT`. No other task's browser tabs were operated. React/JSDOM and
HTTP checks above do not substitute for visual, viewport or actual-download QA.
Keep the migration PR in draft until this acceptance is completed and reviewed.
