# xstash

**Turn X bookmarks into a collection worth revisiting.**

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

xstash is an **MIT-licensed Agent Skill + local bookmark gallery**, created by [Milton / HeYan](https://github.com/MiltonHeYan). Bring your own agent to read authorized X bookmarks, prepare grounded summaries and tags, and save them in a quiet, monochrome gallery.

One search box, a wall of cards, and read-only details. Your agent organizes; xstash stores and displays. There is no built-in model, model-key form, X sign-in page, or manual import UI.

**Recommended setup: your agent + xstash Skill + [CoreSpeed MCP](https://corespeed.io).** CoreSpeed exposes tools for connected accounts, reducing the integration work between authorization and your first bookmarks. You can also build your own connection to the official X API. Both paths are explained below.

## Step 1: Bring a compatible agent

<p>
  <a href="https://code.claude.com/docs/en/overview"><img src="docs/assets/agents/claude-code.svg" alt="Claude Code" width="32" height="32"></a>
  &nbsp;&nbsp;
  <a href="https://developers.openai.com/codex/"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/openai-dark.svg"><img src="docs/assets/agents/openai.svg" alt="Codex" width="32" height="32"></picture></a>
  &nbsp;&nbsp;
  <a href="https://cursor.com"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/agents/cursor-dark.svg"><img src="docs/assets/agents/cursor.svg" alt="Cursor" width="32" height="32"></picture></a>
  &nbsp;&nbsp;
  <a href="https://openclaw.ai"><img src="docs/assets/agents/openclaw.svg" alt="OpenClaw" width="32" height="32"></a>
</p>

You need an agent that can read `SKILL.md`, execute local commands, and access an authorized data source, plus **Git, Node.js 22.12+, and a modern browser**. The gallery terminal and agent must be able to reach the same folder and `127.0.0.1` service.

| Agent | Skill installation directory | Official documentation |
| --- | --- | --- |
| Claude Code | `~/.claude/skills/xstash/` | [Skills](https://code.claude.com/docs/en/skills) |
| Codex | `~/.agents/skills/xstash/` | [Skills](https://developers.openai.com/codex/skills/) |
| Cursor | `~/.cursor/skills/xstash/` | [Skills](https://cursor.com/docs/skills) |
| OpenClaw | `~/.openclaw/skills/xstash/` | [Skills](https://docs.openclaw.ai/tools/skills) |

These major agents provide skill-loading mechanisms; this is not a claim that every version, environment, and MCP configuration has been tested. Command execution must be permitted. Path A also needs remote MCP/OAuth configured in **the agent you are using**. A connection in one client is not automatically available in another. Other agents with the same capabilities can read this project's `SKILL.md` by its absolute path.

## Step 2: Install the xstash Skill

**Install the whole repository, not just `SKILL.md`.** The skill depends on the bundled app, scripts, and format documentation. xstash does not currently publish an installable npm package.

This example uses Codex's user-level skill directory (macOS / Linux / WSL shell). For Claude Code, Cursor, or OpenClaw, change the first line to the corresponding directory above. If that directory already exists, inspect the installation and back up its data first; do not overwrite it.

```sh
XSTASH_HOME="$HOME/.agents/skills/xstash"
git clone https://github.com/MiltonHeYan/xstash.git "$XSTASH_HOME" &&
  cd "$XSTASH_HOME" &&
  npm ci &&
  npm start
```

`npm start` builds and starts the gallery. Open the address printed in the terminal, normally **http://127.0.0.1:4317**, and leave the service running. A new local library starts empty. Reload skills as your client requires; if discovery does not find it, give the agent the absolute path to the installed `SKILL.md`.

In native Windows PowerShell, clone into your chosen skill directory, enter that directory, and run the same `npm ci` and `npm start` commands. Do not paste the shell variable syntax above unchanged.

## Step 3: Authorize access to your X bookmarks

Choose one path. Both require authorization from the bookmark owner. Searching public posts does not grant access to personal bookmarks.

### A (recommended): CoreSpeed MCP

For users who want to get started with managed connections. You do not need to create an X developer App or implement an OAuth callback specifically for xstash. xstash itself never receives CoreSpeed or X credentials.

**1. Add the MCP server.** Sign up or sign in at [CoreSpeed](https://corespeed.io), then follow its [official setup instructions](https://corespeed.io/SKILL.md) in the same agent that will run xstash. One-line installation for Claude Code:

```sh
claude mcp add corespeed https://api.corespeed.io/mcp --transport http --scope user
```

In Claude Code, run `/mcp`, select `corespeed`, and complete browser OAuth sign-in. Adding the server is separate from authorizing it.

For Codex:

```sh
codex mcp add corespeed --url https://api.corespeed.io/mcp
codex mcp login corespeed
```

For Cursor, merge the following server into your user-level `~/.cursor/mcp.json`, preserving existing entries, then authenticate as prompted. For other clients, use the [official CoreSpeed Skill](https://corespeed.io/SKILL.md) and the same HTTP endpoint, `https://api.corespeed.io/mcp`; do not assume another client's configuration format applies.

```json
{
  "mcpServers": {
    "corespeed": {
      "type": "http",
      "url": "https://api.corespeed.io/mcp"
    }
  }
}
```

**2. Connect X.** Open [CoreSpeed Connectors](https://app.corespeed.io/connectors), connect your personal X account, and complete the authorization prompted in the browser. Reload tools and ask the agent to check its current identity, connected accounts, and bookmark-tool schema. Stop if the account is ambiguous or authorization is incomplete; never substitute someone else's account.

**3. Organize a first batch.** Replace the path below with your actual absolute path:

> Use /absolute/path/xstash/SKILL.md. Read up to five bookmarks from my personal X account through the CoreSpeed connection authorized in this agent. Preserve the source text, generate grounded English summaries and 1–4 tags, import into http://127.0.0.1:4317, and verify read-back. Report fetched, added, and verified counts, missing fields, and coverage. Do not use demo data, modify X, or read persistent memory. Stop and explain if the account is ambiguous or authorization is missing.

Refresh the gallery to see your collection. Your chosen agent generates the summaries; xstash does not include a model service or subscription.

**Cost and coverage.** As checked on **2026-10-03**, CoreSpeed's [pricing page](https://corespeed.io/pricing) lists Free at $0 with 3,000 credits / 90 days, and Pro at $20 / month with 10,000 credits / month. Its [billing docs](https://corespeed.io/docs/billing) state 1,000 credits = $1. The public price list does not specify a bookmark-tool rate, so we do not promise a fixed low price per sync or substitute public-post pricing for bookmark pricing. Start with a small batch, then check actual usage and budgets in [Billing](https://app.corespeed.io/billing). Current service pricing takes precedence.

The `twitter__get_my_bookmarks` schema verified for this project (rechecked 2026-10-03) accepts only `account` and `max_results`, with no pagination input. A returned `next_token` does not justify inventing a pagination parameter. The current CoreSpeed workflow therefore produces **partial bookmark snapshots**, not guaranteed full-history sync. Missing authors or media are not fabricated. Recheck the actual schema each run.

### B: Build your own official X API connection

For developers who want direct control over an X developer App, permissions, and billing. **xstash does not currently include an official X API OAuth client or fetching adapter.** You or your agent must implement, review, and maintain the fetching layer, then feed its output into the existing JSON / stdin bridge. This is not a second turnkey sign-in option.

1. **Get developer access.** Sign into [Developer Console](https://console.x.com) with your X account and complete current registration, use-case information, and required agreements. Follow the current New App flow with a name, description, and use case; create or select a Project if your console requires one. See [developer App documentation](https://docs.x.com/fundamentals/developer-apps).
2. **Configure the App.** Enable OAuth 2.0 user authentication, choose the appropriate application type, save its OAuth 2.0 Client ID (and Client Secret for a confidential client), and register the exact callback and website URLs. You must implement the callback; the xstash gallery URL is not an OAuth callback handler. Official guidance recommends `http://127.0.0.1` for local callbacks. The requested URI must exactly match the registered value.
3. **Check scopes and budget.** Bookmark reads require `bookmark.read tweet.read users.read`; add `offline.access` if you need refresh tokens. Read-only use does not require `bookmark.write`. Check endpoint access, purchase credits, and set a spending limit in the console. X currently uses prepaid, usage-based credits; do not follow obsolete Basic / Pro monthly-plan instructions.
4. **Complete user OAuth.** Implement [OAuth 2.0 Authorization Code + PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code): generate random `state` and a PKCE verifier/challenge, direct the user to authorization, validate the callback `state`, and exchange the returned code and verifier for a user access token. Implement refresh only if the requested permissions and response provide a refresh token. Keep credentials in controlled credential storage, never the repository, bookmark JSON, or public logs.
5. **Read that user's bookmarks.** Call `GET /2/users/me` with the user token to confirm the user ID, then `GET /2/users/{id}/bookmarks`. An app-only bearer token cannot read private bookmarks; the path ID must match the authorized user. Request the necessary fields and author/media expansions following the [endpoint reference](https://docs.x.com/x-api/users/get-bookmarks). `max_results` is 1–100 per page; use the returned `next_token` as `pagination_token` for subsequent pages. The current [read rate limit](https://docs.x.com/x-api/fundamentals/rate-limits) is 180 requests per user per 15 minutes; respect `x-rate-limit-reset` after a 429. Rate limits and billing are separate. Do not describe the available API results as a complete historical backup.
6. **Send results to xstash.** Save a successful X-style JSON response (`data`, optional `includes` / `meta`) to a private file, or convert it to the [standard envelope](docs/IMPORT_FORMAT.md). Run the commands below from the project directory installed in Step 2. The bridge imports and verifies read-back. Reject error responses, and keep private tokens out of the input.

```sh
node scripts/agent-bridge.mjs doctor http://127.0.0.1:4317
node scripts/agent-bridge.mjs import http://127.0.0.1:4317 < /private/path/bookmarks.json
```

**Official X API pricing.** [Current official pricing](https://docs.x.com/x-api/getting-started/pricing), checked 2026-10-03, is per resource: standard Post reads cost **$0.005 / resource**. Eligible **Owned Reads**, where the authenticated user also owns the developer App, cost **$0.001 / resource** for that user's bookmarks. As an illustration, 100 eligible bookmark resources alone would cost **$0.10**. That is not a fixed $0.10 price per API request. Additional user lookups, other resources, and agent-model costs are separate. Check actual endpoint/resource classifications and your console bill.

### Which path should you choose?

| Dimension | A: CoreSpeed MCP (recommended) | B: Your own official X API integration |
| --- | --- | --- |
| Setup | Add MCP → sign in → connect X → run the Skill | Developer signup → App setup → PKCE user authorization → implement fetching → connect the bridge |
| Credentials | Managed within CoreSpeed and the agent's authorization systems; never stored by xstash | Securely store App configuration and user tokens; handle refresh and revocation |
| Cost | CoreSpeed plan / credits; check actual bookmark usage in the dashboard | X prepaid credits per resource; Owned Reads have eligibility conditions |
| Maintenance | CoreSpeed manages upstream connections; reauthorization, quotas, and schema changes still apply | Maintain OAuth, pagination, retries, rate limits, field mapping, and API changes |
| Bookmark coverage | Verified tool currently has no pagination input; partial snapshots | Official endpoint supports pagination, subject to endpoint coverage, visibility, and quotas |
| xstash support | Root Skill includes this workflow and the local bridge | Standard JSON / stdin import is available; no built-in X OAuth / fetching adapter |

Both paths also require your own agent / model service. The main reason to choose CoreSpeed is less integration and maintenance work, not an unverified pricing promise.

## What you get

- A monochrome card gallery, one keyword search, and read-only details.
- Agent-generated summaries and tags with declared provenance, kept separately from source text.
- String-ID deduplication and merging; later snapshots do not delete absent bookmarks.
- Local disk storage, CLI backup export, and merge restore; existing notes, favorites, and annotations are preserved.
- Third-party images off by default. Explicitly enabling them loads images only for the current detail session.

There is currently no automatic background sync, full-history retrieval, semantic search, cross-device sync, multi-user system, X mutation, video player, or manual import/edit UI. This is an early-stage project. See [data format](docs/IMPORT_FORMAT.md) and [privacy](docs/PRIVACY.md) for details.

## Local data, backups, and upgrades

The Node service binds only to `127.0.0.1`, saving to `data/bookmarks.json` in the project by default. It has no production authentication. Do not expose a private library through a public tunnel or reverse proxy. Although bookmarks are stored locally, processing through an agent or CoreSpeed remains subject to those services' data-handling terms. Local-first does not mean the entire workflow is offline.

Run from the project directory:

```sh
node cli.mjs stats
node cli.mjs export --output /private/path/new-backup.json
node cli.mjs restore /private/path/new-backup.json
node cli.mjs --help
```

`export` refuses to overwrite an existing file; `restore` merges instead of clearing and replacing. Ordinary imports accept up to 10 MiB / 10,000 rows per batch; the full local library and backup restore allow up to 100 MiB / 50,000 rows. Restore into a new library path for a clean copy. Use CLI `--store` or service `BOOKMARK_STORE` to select a private file. Before running the CLI or bridge separately after a fresh install or source update, run `npm run build`.

When upgrading from the former Commonplace name, back up the old `data/bookmarks.json` first and validate against a copy. The v1 format and `commonplace.library.v1` browser storage key remain compatible. Select an existing library with `BOOKMARK_STORE=/absolute/path/old-library.json npm start`; do not overwrite it with a new empty library.

The static `dist/` build excludes private `data/` and has no Node API. Its fictional preview does not replace a real local bookmark library; existing browser libraries remain origin-specific. Enabling external images sends requests to image hosts. Clicking source links visits X.

## Development and contributions

```sh
npm ci
npm run check
npm test
npm run build
```

Built with strict TypeScript, React, Vite, and a Node HTTP service, with no separate database. See [architecture](docs/ARCHITECTURE.md), [contribution guidelines](CONTRIBUTING.md), [testing](docs/TESTING.md), [agent workflow](docs/SKILL.md), and [independent acceptance](docs/CLEAN_AGENT_ACCEPTANCE.md). Test fixtures are synthetic; tests need no real X or CoreSpeed credentials.

## License and acknowledgments

[MIT License](LICENSE). Created by [Milton / HeYan](https://github.com/MiltonHeYan); contributions are welcome. MIT covers this project's code and original examples, not rights to third-party posts, media, or trademarks.

xstash is an independent open-source project. Claude, Codex, Cursor, OpenClaw, X, and CoreSpeed names and marks belong to their respective owners. [Asset sources](docs/assets/agents/README.md). They identify compatible tools and do not imply official partnership, certification, or endorsement. Current service pricing, permissions, and terms apply.
