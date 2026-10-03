# Fresh-agent installation and acceptance

The distributable skill is the WHOLE `xstash/` folder, with its root
`SKILL.md`, scripts, lib, public, CLI and server. Do not install only the old
docs/SKILL.md. An existing project can be invoked by absolute SKILL.md path with
no global installation. For automatic discovery, copy the clean source folder
into the chosen client's supported skills directory as `xstash` only
after the user selects that scope; never overwrite an existing installation.
Exclude data/, *.log, local-server.pid, qa-artifacts/, node_modules/ and dist/.
Keep the existing running gallery as the explicit destination even if the skill
is copied elsewhere. This package does not silently register MCP or copy tokens.

Minimum environment:
- Fresh conversation, no resume/forked history or persistent-memory retrieval.
- Mac executor with Node >=22, read access to this skill, loopback HTTP access.
- Existing CoreSpeed authorization exposed in this SAME agent, with current
  accounts_list and twitter get_my_bookmarks schemas. No raw key handoff.
- User approval to read their personal bookmarks, summarize and import locally.
- Destination http://127.0.0.1:4317, initially inspect without resetting it.

A new Codex task with the same already connected CoreSpeed plugin is the simplest
candidate; verify tools actually appear in that task. Do not claim its availability
based only on the parent's connection. A blank prompt is context isolation, not a
security sandbox. Give it only this folder, the request below and the connected
tools; do not supply prior reports or intended answers.

Client authentication must be verified in the new agent. For example, Claude
Code's `--bare` mode skips ambient memory/hooks but also skips OAuth/keychain
auth; it is not automatically a ready authenticated runner. Complete model
login and CoreSpeed OAuth in the intended client when needed. Do not transfer
keys between clients or change global configuration implicitly.

## Self-contained test prompt

> Read and use /ABSOLUTE/PATH/xstash/SKILL.md. With your existing
> authorized CoreSpeed connection, read up to five bookmarks from my single
> personal Twitter/X account (ask if ambiguous), generate short Chinese summaries
> and 1–4 grounded tags, and import into my running local xstash at
> http://127.0.0.1:4317. Inspect current schemas; no invented pagination. Use no
> previous conversation or persistent memory. Use no demo records. Do not modify
> X, other projects, credentials or browser sessions. Keep real data private on
> this Mac. Verify the running server's read-back and report counts, annotation
> preservation, missing fields and partial coverage. Stop for any missing auth.

## Evidence required

Report actual discovered schema, account selection and successful live fetch
count (no post bodies in reports). Run bridge doctor, then enriched import and
read-back; explain any preserved annotations. Run the same import again to
verify no duplicates. New records must retain string IDs, source text and truthful
agent provenance. The user should refresh their local gallery. Screen inspection
is optional and separate from API proof, requiring coordination with browser work.
No fabricated expansion data or claim of full-history sync. If auth is missing,
a precise stop is correct behavior but does not count as completed live acceptance.

Synthetic engineering checks: `npm run check && npm test && npm run build`.
Bridge tests use temporary isolated stores. Live acceptance must be separately
identified; these tests alone do not prove that a fresh agent can complete it.
