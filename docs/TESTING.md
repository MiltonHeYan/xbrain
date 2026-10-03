# Testing / 验证说明

运行应用、构建静态文件和核心测试都不需要安装依赖。下面的 DOM 模拟是可选的开发检查，额外使用临时目录中的 JSDOM；它不会给应用添加运行时依赖。

## Core checks

From the project directory with Node.js 22+:

```sh
npm run check
npm test
npm run build
```

`check` validates JavaScript syntax. `test` uses Node's built-in test runner for
normalization, merge rules, source/provenance handling, persistence, CLI behavior,
backup restoration and local HTTP request validation. `build` regenerates static
assets in `dist/`; it does not publish them. All fixtures must be synthetic.

Do not report these checks as proof of actual browser rendering or accessibility.

## Optional DOM interaction checks

On macOS / Linux, install the test-only package into a temporary directory, then
run the included harness from the project directory:

```sh
npm install --prefix /tmp/commonplace-ui-tests --cache /tmp/commonplace-ui-tests/cache jsdom --no-audit --no-fund
UI_TEST_JSDOM=/tmp/commonplace-ui-tests/node_modules/jsdom/lib/api.js node scripts/test-ui.mjs
```

You may append a report path. Its parent directory must already exist; do not
choose an existing report you need to keep, because the harness writes that file.

```sh
UI_TEST_JSDOM=/tmp/commonplace-ui-tests/node_modules/jsdom/lib/api.js node scripts/test-ui.mjs /tmp/commonplace-ui-report.json
```

On other platforms, install JSDOM in a scratch directory and set `UI_TEST_JSDOM`
to the absolute path of its `node_modules/jsdom/lib/api.js`. Without that variable,
the harness attempts a normal `jsdom` module import. If JSDOM is unavailable, it
exits with an explanatory message and code 2. JSDOM is not required by `npm test`.

The harness simulates 25 interactions/conditions with synthetic data, including:

- Empty local library versus fictional static demo
- Import errors, cancel/reopen, guide/back, and replacing samples on first import
- Remote images absent until session-only opt-in
- Search, favorites, mobile collection selection, editing and canceled edits
- Note-only edits preserving provenance and annotation edits becoming user-owned
- Export data shape, refresh persistence, and re-import preserving local edits
- Quota/API/corrupt-storage failures preserving data rather than silently resetting

Fetch, browser storage, dialogs and download interactions are simulated. Passing
this harness is **DOM simulation coverage**, not real-browser, viewport, visual,
screenshot, network-permission, or actual-download verification.

## Actual browser review

Use a supported browser against the local server, or a trusted private static
preview. Check desktop and narrow/mobile layouts with real pixels and keyboard
interaction. Confirm that dialogs fit, focus is visible, buttons are reachable,
long content wraps, and no horizontal overflow hides controls. Check:

1. Cold start, empty state, synthetic sample collection, and returning to the library
2. Valid/invalid imports, duplicate imports, canceled import drafts, and guide/back
3. Editing/canceling details, note-only changes, annotations, favorites and refresh
4. Search/sort/topic filters, no-result recovery, mobile navigation and export
5. Actual downloaded JSON and restoring it into a separate test library
6. External image requests remain absent until explicit opt-in
7. Server errors, corrupted browser storage and quota failures do not reset data

Use only fictional accounts/posts in screenshots, reports and shared previews.
If a browser/environment restriction prevents a check, name that limit and leave
that check unverified rather than substituting a simulated pass.
