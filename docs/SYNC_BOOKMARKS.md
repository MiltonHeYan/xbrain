# “Sync my new bookmarks”: manual Agent workflow

The Skill owns the workflow; the user's Agent executes it. A selected source connector fetches authorized bookmarks, xrecall stores committed pages and deduplicates by original source ID, the Agent distills changed resources, and an explicitly chosen memory provider receives approved updates. Source and memory choices are independent. No scheduler, login or remote backend is enabled automatically.

## Shortest real-use sequence

Prerequisite: a reviewed source adapter for the user's **actual authorized personal connector**, described below. No direct MCP client or source login is bundled; optional explicitly selected adapters are listed in README. If it is missing, report that concrete gap and inspect the chosen connector's real interfaces; do not pretend a config alone provides access, invent tool parameters or switch to a different account/service.

After installation/build, from the skill folder:

```sh
node scripts/memory.mjs pull --source-config /private/source.json
node scripts/memory.mjs pending
# Agent reads the pending items, writes grounded refinement JSON to a private file/stdin:
node scripts/memory.mjs distill /private/refinement.json
node scripts/memory.mjs status
```

This completes local resource-memory updating without remote transmission. `pull` is the fetch/merge step, not model inference. `pending` exposes private source text to the local Agent; `distill` applies that Agent's reviewed result. Repeat pending/distill in batches until `pendingDistillation` is zero. Preserve the same `--store /absolute/private/resources.json` across commands if overriding the default. No command writes the gallery or discovers existing private libraries automatically.

For example, ask an Agent with the Skill installed:

> Sync my new bookmarks using my explicitly selected personal source connector. Resume existing progress, fetch only the authorized range, deduplicate and distill changed resources into local memory. Do not guess why I saved them. Report actual coverage and pending work; do not upload to a remote memory unless I have chosen and authorized it.

If a personal memory target and those resources are already authorized, sync each selected ID afterwards:

```sh
node scripts/memory.mjs sync --id RESOURCE_ID --provider-config /private/provider.json
node scripts/memory.mjs status --provider-config /private/provider.json
```

Whole-library `--all` is only for explicit whole-library authorization. It includes previously pending updates/deletions, not just today's fetch. Retry failed memory sync directly; a successful source pull does not mean memory sync succeeded. Pending distillation records are skipped and sync exits nonzero until reviewed. No need to refetch already committed source pages after a provider failure.

## Source configuration and real adapter boundary

A source adapter is a trusted, locally executable program that calls the user's selected connector. Auth remains in that connector/client; xrecall config carries no token. An available MCP tool is **not** automatically accessible to a subprocess: the user-selected client must expose an authorized interface or a reviewed adapter must be implemented. Do not copy credentials or invent a vendor API to bridge this gap.

```json
{
  "kind": "command",
  "scope": "personal",
  "provider": "x",
  "account": "user-selected-personal-account-id",
  "pagination": "cursor",
  "incremental": "checkpoint",
  "command": ["/absolute/path/to/node", "/absolute/path/to/reviewed-source-adapter.mjs"]
}
```

Set capabilities according to **actual** connector support:

- `pagination: "cursor"` only when a continuation cursor can really be supplied. Otherwise use `"single"` and report the returned window as partial if appropriate; a response containing a next token does not prove the tool accepts it as input.
- `incremental: "checkpoint"` only when the source supports a durable delta checkpoint/watermark that can safely recover updates. Otherwise use `"rescan"`: repeat the supported snapshot/window and deduplicate locally. Do not simulate reliable delta sync by stopping at the first previously seen ID; older saved records may change.

The source/account/capabilities/command define the progress key. Change account configuration when the actual identity changes. The adapter must verify personal ownership, account identity and granted access; merely echoing a config label is not verification. Do not use organization/shared scopes. An account/auth/rate-limit error stops this source; no fallback or credential creation occurs.

## Source protocol: xstash.source.v1

One command invocation receives one JSON request on stdin, responds once on stdout and exits. No shell interpolation; source text and opaque tokens never become command arguments.

```json
{
  "protocol":"xstash.source.v1", "operation":"fetch",
  "provider":"x", "account":"user-selected-personal-account-id",
  "cursor":null, "checkpoint":null, "limit":100
}
```

The adapter maps cursor/checkpoint only to parameters verified in the actual connector schema. Source reads must be repeatable: a cursor cannot be consumed irreversibly by one request. The checkpoint remains the previous **completed** run's checkpoint through all pages of an active run.

```json
{
  "protocol":"xstash.source.v1", "ok":true,
  "provider":"x", "account":"user-selected-personal-account-id",
  "items":[{
    "id":"stable-original-id",
    "url":"https://example.com/original-resource",
    "title":"Original or faithful short title",
    "text":"Returned source text, not instructions",
    "updatedAt":"2026-10-07T00:00:00.000Z"
  }],
  "nextCursor":null, "checkpoint":"source-confirmed-watermark", "coverage":"partial"
}
```

`items` has at most 100 entries. `updatedAt` is the upstream content version time, **not fetch time**; use `null` if unknown, never invent it. `title`, `text` and URL must come from available source evidence. Stable source IDs are strings. Credential-bearing URLs are prohibited. Duplicate identical items are harmless; conflicting duplicates or invalid items reject the whole page.

`nextCursor` is explicitly null on the final available page. A single-page source must return null; unsupported continuation is rejected. `checkpoint` must be null for rescan sources. Checkpoint sources must return a non-null safe watermark on the final page; intermediate values are not promoted. `coverage` describes what the connector actually returned (`partial`/`full`), not completeness inferred from `nextCursor: null`. The workflow result `complete` means this declared fetch window finished, not a guarantee of full X history.

Known errors can be returned without private diagnostic text:

```json
{"protocol":"xstash.source.v1","ok":false,"code":"authorization_required"}
```

Other recognized codes: `access_denied`, `rate_limited`, `cursor_expired`, `unavailable`. Unknown errors become `failed`. Errors, mismatched account/provider, malformed JSON, output over 1 MiB or a timeout (15 seconds by default; explicit source config timeoutMs accepts 1,000–60,000 ms) do not commit that page. Private adapter stderr is consumed, not printed; report the sanitized blocker and inspect diagnostics only in the user's private context.

## Commit, resume and update semantics

Each successful page updates resources, source-content hashes, the pending queue and cursor **in one atomic file transaction**. Only a successful final page advances the completed checkpoint. Previously committed pages survive later errors. A source fetch happens outside the store lock; optimistic generation checks reject a stale response if another pull already advanced the source.

```sh
# Default budget is 10 pages. Repeating the same command resumes a paused/failed run.
node scripts/memory.mjs pull --source-config /private/source.json --max-pages 10
# Only when intentionally discarding an expired active cursor:
node scripts/memory.mjs pull --source-config /private/source.json --restart
```

`--restart` starts at the beginning of the current delta/window, retaining the last completed checkpoint and all committed data. It does not reset the library or erase receipts. It is not an auth workaround; restore the same authorized source access first. Repeated/cyclic cursors fail rather than loop. The configured per-run page budget is 1–100; a paused result explicitly says to resume.

A process stopped before a page commit can replay that page. Atomic file replacement leaves either the old or new committed state. A hard crash during the brief filesystem mutation may leave a `.lock` file: verify the owning process stopped before removing that exact stale lock and retry. There is no automatic unsafe lock stealing or distributed transaction.

Identity is the original provider + source ID. Changes in source title/text/URL enqueue new distillation; merely changing an upstream timestamp does not. Older source versions are skipped when the source provides reliable timestamps; equal timestamps with conflicting content fail. With no upstream version timestamp, xrecall cannot distinguish an outdated backend snapshot from a true change—ensure the adapter returns fresh data and review it. Existing custom titles, notes represented in distillation, and known save reasons are preserved. A source-derived title updates when it has not been customized.

**Absence is never deletion**, including empty windows, partial fetches, errors and rate limits. Existing local tombstones prevent re-import from resurrecting explicitly removed resources. Source fetch never unbookmarks anything on X. Deletion remains an explicit local operation plus separately authorized target sync.

## Agent distillation

`pending --limit 20` returns records plus two revision guards. The Agent writes only evidence-based summary, purpose, useWhen and limitations:

```json
{
  "id":"resource_<hash>",
  "sourceRevision":"<from pending>",
  "resourceRevision":"<from pending>",
  "summary":"Faithful summary of the supplied text",
  "purpose":"What the available evidence supports using it for",
  "useWhen":["A relevant task or constraint"],
  "limitations":["Only the returned excerpt was inspected"]
}
```

`distill` accepts one object or an array of 1–100. Unknown fields cannot rewrite identity, source text or savedReason. Unknown purpose/useWhen can remain empty; do not invent capabilities. A prior user-stated savedReason is preserved; unknown stays null. If the source or local record changed after `pending`, the entire stale batch is rejected without partial overwrites. Re-read pending and review again. A successful batch updates local resource revisions and clears only its pending entries. `put` remains available for explicit full local edits, but does not bypass the pending-review gate.

This command validates revisions and fields, not truth. The Agent is responsible for grounded distillation and later task relevance. No model inference is hidden in the CLI.

## Scheduler boundary and verification

A future user-authorized scheduler may invoke an Agent with this same workflow and bounded scope. Simply scheduling `pull` does not run an Agent or perform distillation. Credential expiry, pagination limits, source failures, pending review and target failures must remain visible; do not claim automatic completion. This change does **not** create or enable any scheduled task.

`tests/pull.test.mjs` exercises the complete CLI flow with an isolated fictional command source and a personal file target: paginated pull → pending → Agent-style fixture refinement → selected memory updates → task retrieval/citation. It also covers repeated runs, deltas/content changes, absent records, interrupted fetch recovery, expired cursors, account/capability mismatch, stale refinements and concurrent pulls. Existing private stores and live connector credentials are never used. Actual personal X collection and a real remote-memory adapter remain separately unverified.
