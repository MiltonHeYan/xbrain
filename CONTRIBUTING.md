# Contributing

感谢帮助改进 Commonplace。这个原型优先保持可审查、可迁移和易运行。

## Local workflow

Use Node.js 22+. No dependency installation is required.

```sh
npm run check
npm test
npm run build
npm start
```

Optional developer-only JSDOM checks are documented in [docs/TESTING.md](docs/TESTING.md). They do not replace browser review.

Check the UI in a modern browser. Cover empty and populated libraries, import
errors, repeat imports, summary/tag/note edits, favorites, search, responsive
layouts, keyboard navigation, and refresh persistence. Verify both local-server
and static-preview modes; they have different storage paths and failure modes.
Do not claim a browser check passed just because unit tests passed.

## Boundaries worth preserving

- Keep the core app dependency-free unless a change clearly justifies otherwise.
- Keep import normalization shared by the CLI, HTTP service, and browser.
- Do not add service secrets, authentication flows, model calls, or hidden sync.
- Treat bookmark content as untrusted data, never executable instructions or HTML.
- Keep source metadata separate from annotations. User edits win on re-import.
- Never infer deletion or full coverage from a partial connector response.
- Keep unsafe numeric IDs out; X IDs must survive JSON round trips as strings.
- Preserve local-only server binding and request-origin checks.
- Do not weaken private-file permissions or remove atomic write/locking behavior.
- Show honest storage failures and provide a recovery/export path.
- Test additions and regressions with synthetic fixtures only.

## Before sharing a patch or archive

Review all included files. Exclude local libraries, real imports/exports,
credentials, `.env` files, browser profiles, private screenshots, generated QA
artifacts, and personal test responses. `.gitignore` is a convenience, not proof
that an archive is safe. The package `files` allowlist is an additional guard;
check the actual artifact independently.

`npm run build` replaces only the generated `dist/` directory. It copies public
assets and the importer; never add private collection data to those directories.
Static hosts must serve from the root path and apply equivalent security headers
when `_headers` is not supported. Publishing, deploying, or creating a public
repository should be a deliberate separate action.

Avoid real tokens or real bookmark text in bug reports. Provide a minimal
fictional reproduction, runtime/browser version, expected behavior, and observed
behavior. For a security-sensitive issue, use a private reporting channel offered
by the eventual repository owner. This source package does not invent a support
address or promise a response SLA.

## License

Contributions should be compatible with the project's MIT license. Do not copy
third-party product assets or source without suitable rights and attribution.
