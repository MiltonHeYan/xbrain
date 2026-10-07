# Resource memory: CLI and adapter contract

Xbrain is a standalone Skill and local resource store. Source access, Agent reasoning and memory destination are separate. No remote provider is selected implicitly. The existing gallery stays a small black-and-white management view; these memory operations are Agent/CLI operations, not new UI tabs.

For fetching new source bookmarks, incremental/page recovery and Agent distillation, see [SYNC_BOOKMARKS.md](SYNC_BOOKMARKS.md). Source pull and optional memory-provider sync are distinct operations.

## Local quick start

```sh
npm ci
npm run build
node scripts/memory.mjs --help
node scripts/memory.mjs status
node scripts/memory.mjs put examples/synthetic-resource.json --store /tmp/xrecall-example/resources.json
node scripts/memory.mjs search "React dialog accessibility" --store /tmp/xrecall-example/resources.json
```

The example is explicitly fictional and uses a separate store. Do not import it into a private library as real evidence. `npm start` still runs the optional gallery; its `BOOKMARK_STORE` does not change resource memory's location. The memory CLI's `--store` selects a separate resource file; default is `<repo>/data/resource-memory.json`, independent of shell cwd. It is gitignored and never bundled. No command automatically selects the existing 4317/4319 data or fetches new X bookmarks.

To capture a selected existing gallery library locally:

```sh
node scripts/memory.mjs capture --bookmarks /absolute/private/bookmarks.json
```

Capture keeps the gallery bytes intact, does not sync externally, skips tombstones, preserves existing distillation and marks changed source text for review. New unknown purpose, useWhen and limitations are empty; unknown savedReason is null. Normal absence from a later collection is not deletion.

## Resource schema

`put FILE` or `put -` accepts one complete resource or a nonempty array (up to 1,000; input at most 10 MiB). Unknown fields are not stored. Updating is a full replacement of the resource fields, not a partial patch: `get RESOURCE_ID` reads the current record; retain fields that should not change. `get` and `search` emit private content to stdout.

```json
{
  "source": {"provider": "web", "id": "fictional-dialog-guide", "url": "https://example.com/dialog-guide"},
  "title": "Fictional accessible dialog guide",
  "text": "A fictional reference about keyboard focus and dialog accessibility.",
  "summary": "A sample checklist, not a real product recommendation.",
  "purpose": "Review keyboard behavior in React dialogs",
  "useWhen": ["React dialog accessibility review"],
  "limitations": ["Fictional test resource; not independently verified"],
  "savedReason": null,
  "updatedAt": "2026-10-07T00:00:00.000Z"
}
```

The CLI generates `id = "resource_" + SHA256(JSON.stringify([provider, source.id]))`. Provider names are normalized to lowercase; IDs are trimmed, case-sensitive strings. An optional supplied `id` must match. Original source ID is stable across content updates; titles, URLs and timestamps do not create new identities. Store both URL and original ID to cite and find the source. URLs must be HTTPS without embedded credentials; do not include secret query tokens either.

Same ID + identical payload is unchanged; a changed payload needs a strictly newer `updatedAt`. Stale or same-time conflicting edits fail without overwriting the store. `updatedAt` records this resource's revision time, not proof that the external source was checked at that time. If the source date or capability is unknown, say so in limitations. Unknown savedReason is required as `null`; the Agent must not invent it.

```sh
node scripts/memory.mjs delete RESOURCE_ID
node scripts/memory.mjs status
```

Deletion removes local retrieval and creates a tombstone. It neither changes the original source nor the gallery. Remote deletion requires an explicit sync for each previously used destination. Tombstones are retained (no garbage collector in this MVP) to prevent re-capture resurrecting deleted resources. An explicit restore via `put` needs an updatedAt newer than the deletion.

Atomic replacement, private new files (0600), private new directories (0700), and a cross-process lock protect writes. Existing parent-directory permissions are not changed. A busy lock fails promptly; if a process crashed, verify it stopped before removing only its stale lock. The store is limited to 20 MiB and 10,000 combined resources/tombstones. Do not point memory commands at a bookmark store; their schemas are distinct and invalid stores fail closed.

## Retrieval and citations

`search "task keywords" --limit 5` returns lexical candidates with a relevance score, matched terms, the full resource and `citation: {id, url, updatedAt}`. Chinese and English words are segmented; common filler words are removed. Results require positive matching content and at least 35% query-term coverage. No match returns an empty list. Search output contains private content; don't pipe it to shared logs.

This is deterministic candidate retrieval, not a semantic guarantee. The external Agent must judge useWhen, limits and source freshness and use a candidate only when it helps the actual task. Cite the original HTTPS source URL, not a provider-specific memory ID. There is no always-on monitor, Agent interception or guarantee that an Agent which has not loaded this Skill will remember anything.

## Provider contract

Built-in options:

- **No config:** local capture, put, search, delete and status work; status explicitly says `not_configured`. `sync` fails with a clear unsynced message. No network request occurs.
- **Personal file adapter:** another absolute private file implementing the same resource schema. Fully working local integration for another Agent that can read that file; it is not a cloud service.
- **Trusted command adapter:** executes a user-selected absolute executable with JSON stdin/stdout. This is a real transport and interface, tested with mocks; a particular remote service still needs its own reviewed implementation. There is no automatic vendor/MCP binding.

A private file-provider config:

```json
{"kind":"file","scope":"personal","path":"/absolute/private/chosen-memory.json"}
```

A command-provider config (replace the paths with a trusted installed adapter):

```json
{"kind":"command","scope":"personal","namespace":"my-xstash-resources","command":["/absolute/path/to/node","/absolute/path/to/my-reviewed-adapter.mjs"]}
```

Config is explicitly supplied each time with `--provider-config`; nothing selects an account by ambient connector availability. Use a dedicated, stable personal destination per config. If the executable's underlying account changes, change the namespace/config as well; sync receipts are keyed by config identity, not a remotely verified account. Config metadata is not proof of actual service privacy: the adapter must verify the user's chosen personal account/namespace. Shared or organization config scopes are rejected.

Before uploading, the user chooses the destination, account/namespace and allowed resources. Do not upload a whole private collection merely because an adapter is available. Configs contain paths/scope, not credentials. Adapters manage auth through the user's existing credential mechanism outside this repository and must not emit credentials or source contents to diagnostic logs.

```sh
node scripts/memory.mjs sync --id RESOURCE_ID --provider-config /private/provider.json
node scripts/memory.mjs status --provider-config /private/provider.json
node scripts/memory.mjs search "task keywords" --provider-config /private/provider.json
# Only when the entire collection is authorized for this destination:
node scripts/memory.mjs sync --all --provider-config /private/provider.json
```

Sync sends full selected records or tombstones. Records in the Agent distillation queue are skipped with `blocked_pending_distillation` and a nonzero exit until reviewed; `status` exposes pendingDistillation and resumableSources. It never silently switches providers after failure. Separate receipts retain confirmed revisions; partial failures remain pending and exit nonzero. Retrying must be safe: the adapter must upsert by `(namespace, id)` and delete idempotently. Receipts are last acknowledgements, not a live provider audit. If a process crashes after a provider write but before receipts are saved, retry replays that operation; idempotency is mandatory. The local lock stays held during a sync. There is no distributed transaction, conflict merger, scheduled retry, or provider-to-provider migration. Do not concurrently edit the same resource independently in multiple destinations.

Each command invocation receives exactly one JSON request and must exit. All outputs use `protocol: "xstash.memory.v1"` and `ok: true` for confirmed success. Mutation requests:

```json
{"protocol":"xstash.memory.v1","namespace":"my-xstash-resources","operation":"upsert","id":"resource_<hash>","revision":"<payload-sha256>","resource":{"...":"full normalized resource"}}
```

```json
{"protocol":"xstash.memory.v1","namespace":"my-xstash-resources","operation":"delete","id":"resource_<hash>","revision":"<tombstone-sha256>"}
```

A successful mutation returns **the exact id and revision**:

```json
{"protocol":"xstash.memory.v1","ok":true,"id":"resource_<hash>","revision":"<received-revision>"}
```

An adapter must only acknowledge after the chosen service confirms the write/deletion, preferably read-back verification. If the vendor assigns its own IDs, the adapter must persist mapping from the stable namespace/id and use that mapping for updates/deletion; do not append a new memory each time. An adapter that lacks update/delete support does not satisfy this contract. Upserts and deletes must affect only this namespace and user's authorized resources. Preserve source citations and all resource fields, even if the vendor stores them as a structured text envelope.

Search request/response:

```json
{"protocol":"xstash.memory.v1","namespace":"my-xstash-resources","operation":"search","query":"React dialog accessibility","limit":5}
```

```json
{"protocol":"xstash.memory.v1","ok":true,"resources":[]}
```

Return complete valid resources, at most 50, with no duplicates. Xbrain hides local tombstones, prefers local records when IDs overlap, then lexically reranks the candidates. Cross-language semantic-only results may be filtered out. Adapter errors, mismatched acknowledgements, invalid JSON, >1 MiB output, or a 15-second timeout do not confirm sync. stderr is consumed but not displayed to prevent accidental credential disclosure; inspect adapter logs privately when needed. The process runs without a shell; trust and review its executable/config before invoking it.

## Verification boundary

The automated suite uses only fictional resources, temporary files and a local mock command. It covers source-ID deduplication, newer updates/stale rejection, delete propagation, retry receipts, local/remote candidate retrieval, original citations, unknown save reasons and unchanged gallery bytes. It does not validate a particular external service, current connector capabilities, live X access or background Agent recall. Choose a real personal memory service and inspect its actual interfaces before claiming that integration is complete.


## Optional visual design analysis

Resources may carry a validated `design` field. Older records omit it and remain
readable with unchanged IDs, storage version and paths. See [DESIGN.md](DESIGN.md)
for images, evidence-backed domains/features, uncertain style labels, `inspect`
and revision-guarded `analyze`. Local search also accepts `--domain`, `--feature`
and `--style`; complete results retain original source and image evidence.
Providers should preserve the optional field on round trips. No remote provider
or visual model is selected automatically.
