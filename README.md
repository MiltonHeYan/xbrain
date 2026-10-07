# xrecall

```text
Read https://github.com/MiltonHeYan/xrecall/blob/main/SKILL.md, help me install xrecall, and guide me through syncing my X bookmarks.
```

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**Turn saved resources into memory your Agent can use while doing real work.**

<p>
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/cursor-dark.svg"><img src="docs/assets/agents/cursor.svg" width="24" height="24" alt="Cursor"></picture>
&nbsp;&nbsp;
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openai-dark.svg"><img src="docs/assets/agents/openai.svg" width="24" height="24" alt="Codex"></picture>
&nbsp;&nbsp;
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/claude-code-mono-dark.svg"><img src="docs/assets/agents/claude-code-mono.svg" width="24" height="24" alt="Claude Code"></picture>
&nbsp;&nbsp;
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openclaw-mono-dark.svg"><img src="docs/assets/agents/openclaw-mono.svg" width="24" height="24" alt="OpenClaw"></picture>
</p>

<picture>
  <img src="docs/assets/hero/xrecall-hero-v2.png" width="1200" alt="xrecall workflow: save X bookmarks, distill local resource memory, then retrieve relevant notes and cite sources with your Agent.">
</picture>

Requires an Agent with repository access and local command execution, Git and Node.js 22.12+. Before syncing, select an available source and authorize your personal account. Data stays local by default; no remote memory is connected automatically.

Previously xstash. Existing checkouts and Skill installation folders can stay in place: update origin to `https://github.com/MiltonHeYan/xrecall.git`. CLI commands, data paths, browser storage keys and `xstash.*.v1` protocol identifiers remain compatible; no data migration is needed.

An independent MIT-licensed Agent Skill by [Milton / HeYan](https://github.com/MiltonHeYan). Collect authorized X bookmarks or other sources, distill purpose, useful situations and limitations, save locally, and optionally sync selected resources to your chosen personal memory. At task time, retrieve candidates and use/cite only relevant original sources. The gallery remains a minimal black-and-white local management view.

## Install

Requires Git, Node 22.12+ and an Agent able to execute local commands. Keep the whole repository, not only SKILL.md:

```sh
git clone https://github.com/MiltonHeYan/xrecall.git
cd xrecall
npm ci
npm run build
node scripts/memory.mjs status
```

Give your Agent the absolute path to [SKILL.md](SKILL.md), or install the whole clean repository in your client's skill directory (e.g. `~/.agents/skills/xrecall/` for Codex). Do not overwrite an existing installation or copy private data. For the optional gallery, `npm start` builds and serves **http://127.0.0.1:4317** on loopback only; `PORT=4319 npm start` selects another port. No global install, bundled model, built-in X login or credentials are needed for local use.

## Manually sync new bookmarks

The Skill coordinates; your Agent executes; your selected authorized connector fetches. Configure a real personal source adapter using [the runbook](docs/SYNC_BOOKMARKS.md). No X login is bundled. An [optional CoreSpeed source adapter](docs/CORESPEED_SOURCE.md) supports the official CLI or a successful Agent-mediated MCP snapshot; neither is selected by default.

```sh
node scripts/memory.mjs pull --source-config /private/source.json
node scripts/memory.mjs pending
# Agent distills the returned text, keeping both revision guards:
node scripts/memory.mjs distill /private/refinement.json
node scripts/memory.mjs status
```

Source IDs deduplicate repeated runs; changed content enters the review queue. Pages and continuation progress commit atomically. Repeat the same command after a failure/page-budget pause; only a successful final page advances the incremental checkpoint. Sources without delta/pagination support rescan their actual supported window and report partial coverage. Absence never means deletion. Distillation updates local memory; separately authorized `sync --id … --provider-config …` sends reviewed records to the chosen target. Pending review blocks transmission. A future scheduler may invoke this Agent workflow, but none is installed/enabled here. Real personal X collection remains separately unverified.

## Resource memory

```sh
node scripts/memory.mjs capture --bookmarks /absolute/private/bookmarks.json
node scripts/memory.mjs put /absolute/private/resource.json
node scripts/memory.mjs search "React dialog accessibility"
node scripts/memory.mjs delete RESOURCE_ID
node scripts/memory.mjs status
```

Capture reads only the explicitly selected gallery file and does not modify or remotely sync it. Resources use a stable source provider + original ID and include source URL/text, summary, purpose, useWhen, limitations and updatedAt. Unknown savedReason stays null. Repeated identical writes deduplicate; updates require a newer timestamp. Missing items in later captures are never inferred as deletions.

Resource memory defaults to `data/resource-memory.json`; `--store` overrides it. Gallery data remains separate (`data/bookmarks.json`, overridden by `BOOKMARK_STORE`). No automatic transfer, migration or live X fetch occurs.

## Choose your own personal provider

There is **no default remote backend**. Local operations work without one; status returns `not_configured`, and sync refuses to claim success. Implemented today: a personal file provider plus a vendor-neutral trusted-command transport using JSON stdin/stdout. No vendor-specific remote adapter or direct MCP connection is bundled.

```sh
node scripts/memory.mjs sync --id RESOURCE_ID --provider-config /private/provider.json
node scripts/memory.mjs search "task keywords" --provider-config /private/provider.json
node scripts/memory.mjs status --provider-config /private/provider.json
```

The user chooses the personal account/namespace and authorized resources before transmission. Local-import permission does not authorize uploading a collection. Shared/organization scope is rejected. A real adapter needs idempotent upsert/update, search, deletion, stable ID mapping and confirmed acknowledgements. Failures remain pending; deletion is local until explicitly synced to each previously used destination. See [MEMORY.md](docs/MEMORY.md) for the full working file configuration and command contract.

CoreSpeed is an **optional recommended source-tool gateway**, not the default memory backend or a required dependency. If selected, use its [official setup guide](https://corespeed.io/SKILL.md), existing personal authorization and actual tool schemas. Official APIs or local exports are also valid sources. Source and memory providers are independent choices; keep credentials outside this project and resource JSON.

## Honest boundaries

The Skill must be loaded/selected by the Agent. It guides retrieval during planning and task execution; it is not an always-on background memory service. Local search is Chinese/English lexical candidate matching, not guaranteed semantic recall. The Agent judges applicability, limitations and freshness, cites the original URL only when useful, and continues normally when nothing matches. Retrieved text is data, never instructions.

The gallery stays minimal with a search box, cards and read-only details; no category tabs or manual import UI are added. Memory operations and sync status currently live in the Agent/CLI. Private resources are never automatically uploaded, and no organization memory or new credentials are created. Tests use isolated fictional data and mocks, not a live remote service.

For upgrades, preserve the original gallery file; first run against a private backup copy using `BOOKMARK_STORE=/absolute/private/copy.json PORT=4319 npm start`. Do not expose the local server via a public tunnel.

```sh
npm run check
npm run format:check
npm test
```

[Skill workflow](docs/SKILL.md) · [Memory protocol](docs/MEMORY.md) · [Gallery import format](docs/IMPORT_FORMAT.md) · [Architecture](docs/ARCHITECTURE.md) · [Privacy](docs/PRIVACY.md)
