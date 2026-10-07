# Privacy and security / 隐私与安全

xrecall 把数据边界尽量做小，但“本地优先”不等于加密、隔离或绝对隐私。导入真实收藏前，请了解下面的区别。

## Where data goes

### Local Node app

The local service binds to `127.0.0.1` and accepts expected localhost Host/Origin
values. Imports and edits go from the browser to that local service and are
stored as plaintext JSON at `data/bookmarks.json`, or the configured
`BOOKMARK_STORE` path. CLI imports use the same format and locking mechanism.

The service uses same-origin request checks, bounded input, private creation
permissions for new data files/directories, atomic file replacement, and a
short-lived filesystem lock. These reduce common mistakes; they are not a
multi-user security system. Other software running as your user, a compromised
browser/extension, existing filesystem permissions, device backups, and anyone
with access to the device remain relevant risks.

The app has no production authentication or authorization. Do not expose its
HTTP API through a public tunnel, reverse proxy, or changed bind address.

### Static / hosted preview

A static build contains no Node backend or account connection. A collection is
stored in the browser's `localStorage` for that exact origin. Imports are parsed
by page JavaScript, not sent to a bookmark-import server in the provided static
app. The host still receives normal page/asset requests, and it controls the
JavaScript served on that origin. Anyone who changes that code may change its
behavior. Only use a hosted instance you trust; prefer reviewed local source
for sensitive collections.

The fictional sample collection stays separate from the personal library. Sample
edits last for the current session only. Sample exports are labeled synthetic;
the UI refuses to import those demo exports as a personal collection. Explicit
synthetic test fixtures in `examples/` can still be imported intentionally.

Browser storage is plaintext, has limited capacity, and is not a reliable
backup. Clearing site data, using a private window, switching browsers/domains,
or a storage quota failure can make a library unavailable. Different devices
and origins do not synchronize. Browser extensions and other code authorized on
that origin may be able to read the data.

### Agent and CoreSpeed

xrecall does not connect directly to CoreSpeed, X, or a model provider.
Your agent's configured connector reads the authorized account and, if asked,
your selected model processes the bookmark text. Those services have their own
permissions, retention policies, billing and terms. Authorizing the gallery
import does not authorize posting, liking, account changes, or unrelated reads.

Use the [current CoreSpeed setup guide](https://corespeed.io/SKILL.md). Complete
credential setup in the intended client or service. Never put an X token,
CoreSpeed key, model key, password or OAuth secret in a collection, repository,
URL, screenshot, browser field, or shared log. This project includes no setup
script that creates credentials or edits your agent's configuration.

## Network behavior and remote content

The provided app has no analytics SDK, advertising script, model client,
background sync, or remote font dependency. Its local API requests stay on the
same origin. That does not mean every user action is network-free:

- External images are off by default. The “Show external images” control in bookmark details
  enables them only while that detail is open; closing it resets consent.
  Loading a referenced remote image contacts that image host. It can observe
  your IP address and request metadata even when referrer information is
  suppressed. Image URLs may themselves contain identifiers.
- Opening an original post or another external URL contacts that destination.
- A hosted page must be fetched from its host, which may keep access logs.
- Your separate agent/connector/model workflow has its own network behavior.

Do not treat remote media URLs as archived images or guaranteed availability.
No media proxy or offline media download is included. For an offline collection,
leave media empty and avoid opening external links. Review the image-loading disclosure before enabling remote media.

## Imported text is untrusted

Posts, summaries, tags and notes must be rendered as inert text. Imported HTML
or instructions are data, not permission to run commands, navigate to links,
change accounts or reveal secrets. The normalizer keeps only supported fields,
rejects unsafe URL schemes and embedded credentials, and does not execute the
input. Labels such as `agent` represent supplied provenance, not verified truth.

Only load collection backups you trust. Local JSON files are not an encrypted
vault or a signed data format. Review external code and changes before running
them, even when the demo content itself is fictional.

## Backups and recovery

Export a private copy regularly. Exports include your original text, summaries,
tags, notes, favorite state, URLs and retained provenance. Sharing a backup can
reveal interests and private notes even if the original posts are public.

`node cli.mjs export --output NEW_FILE` refuses to overwrite an existing file.
Without `--output`, the CLI prints to stdout, which may be captured by a terminal
or automation log. Choose a private output path and avoid shared folders.

Use `restore` to merge a version 1 backup. It does not delete existing data or
replace existing local annotations. To inspect a recovered copy without changing
your current library, restore to a new `--store` path and point a separate local
server at it.

If an interrupted process leaves a `.lock` file, verify that no server or CLI
process is still writing that store before removing the stale lock. Never
remove a lock merely to force a concurrent import through. Keep a copy of any
corrupt data file before investigating it; the app does not silently replace
invalid stores with empty libraries. The UI blocks editing and importing after a
load failure rather than silently switching to an empty or fictional collection.

## Sharing the source safely

The repository examples and browser demo are fictional. Real fetched account
content must not become test fixtures, demo cards, committed files, screenshots,
or public build assets. The `data/` directory, environment files, logs and QA
artifacts are ignored, but ignore rules alone do not sanitize an archive.

Review actual archive contents before sharing. Only the Vite client bundle, styles, and compiled shared importer go into
`dist/`; do not put personal JSON under `src/` or other source paths.
`.build/` contains compiled service/client code and is also excluded from Git. Building does not publish the site. Publication and any sharing of real
collection data are separate decisions.

This prototype has not undergone an independent security audit. No security
certification, account-backup completeness, encrypted storage, or service-level
guarantee is claimed.


## Resource memory

Resource memory is a separate local file and stays local without an explicitly
selected provider. `capture` reads only the named gallery file, never changing it.
`search` prints private resource content to stdout; use it only in the user's
private Agent context, not public logs. Sync sends selected complete records,
including source text, summary and any stated save reason, to the chosen provider.
Local-import authorization does not authorize an external upload. Select the
personal account/namespace and resource scope before syncing; organization/shared
scope is not supported. Command adapters are trusted executable code, not data:
review their configuration and actual service permissions before executing them.
Authentication remains outside the repository. No credentials belong in resource
URLs (including query strings), records, fixtures, configs or command arguments.

Deleting a local resource hides it from retrieval and retains a tombstone. It does
not delete a source bookmark or gallery record, and does not contact any provider
until an explicit sync. Sync deletions to each previously used provider; selecting
a new provider does not purge an old one. Adapter acknowledgements are trusted
receipts, not independent cryptographic proof of remote deletion. See MEMORY.md.


Source refresh stores opaque continuation tokens and checkpoints only inside the
private resource-memory file; do not export them to shared logs. Source config
selects a personal account and a trusted executable, not credentials. The adapter
must verify that account against its actual connector. Pull never writes the
gallery or deletes absent bookmarks. Source failures do not switch account/service.
Raw changes remain pending until Agent distillation; memory-provider sync skips
pending entries. No scheduler or external upload is activated by installation.
