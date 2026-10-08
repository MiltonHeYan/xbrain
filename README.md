```text
Read https://github.com/MiltonHeYan/xbrain/blob/main/SKILL.md, help me install Xbrain, and organize my authorized design references for retrieval.
```

# Xbrain

**Turn scattered design references into context your Agent can find and explain.**

<p><img src="docs/assets/agents/cursor.svg" width="24" alt="Cursor"> <img src="docs/assets/agents/openai.svg" width="24" alt="Codex"> <img src="docs/assets/agents/claude-code-mono.svg" width="24" alt="Claude Code"> <img src="docs/assets/agents/openclaw-mono.svg" width="24" alt="OpenClaw"></p>

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

## “I saved the look, but I don't know its name.”

Your Agent looks at your saved UI or interior images, records visible features and suggests possible styles with evidence. Ask for a design: retrieve relevant originals, compare shared details, confirm a direction, then turn it into requirements. Explore those connections in the local reference graph.

A saved image is not a preference. Style labels remain hypotheses until you confirm them. Images the Agent cannot view stay unanalyzed.

![Xbrain graph with hardware references and source evidence](docs/assets/xbrain-graph.png)

## What you need

Git, Node.js 22.12+, and an Agent with local commands and image understanding. Your existing connector supplies authorized bookmarks; Xbrain organizes and retrieves them. Memory works locally; you choose any external backend. [CoreSpeed](https://corespeed.io) is an optional connector choice.

## Your Agent and X access

Choose your Agent separately from how it accesses X. Claude Code, Codex, Muse, OpenClaw or Hermes can be your host if it supports local commands and image understanding; each still needs an authorized source for your private bookmarks. Public X search alone does not provide that access.

[Grok Bot's X plugin](https://docs.x.ai/grok-bot/tag-on-x) supports bookmarks, according to its documentation. Xbrain does not yet include a Grok Bot adapter or a verified end-to-end import through it. If you prefer another Agent, choose an access route:

- **Official X API:** register a [developer account and app](https://docs.x.com/x-api/getting-started/getting-access), fund API usage under [X's current pricing](https://docs.x.com/x-api/getting-started/pricing), and authorize your account with user OAuth. Bookmark reads need `bookmark.read` and the endpoint's other required scopes. Xbrain does not bundle an X OAuth client or direct API adapter; this route needs a reviewed [source adapter](docs/SYNC_BOOKMARKS.md).
- **Optional CoreSpeed MCP:** [CoreSpeed](https://corespeed.io) handles the connector setup. Give your Agent `set up https://corespeed.io/SKILL.md`, then connect your personal X account. Use the included [CoreSpeed source adapter](docs/CORESPEED_SOURCE.md). It currently imports a partial window of at most 100 bookmarks per call, with no continuation; it cannot promise your full history. Metered calls use CoreSpeed credits.

Keep credentials outside the repository. See [X's bookmark permissions](https://docs.x.com/x-api/posts/bookmarks/introduction) and [OAuth scopes](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code).

[Install & use](SKILL.md) · [Design workflow & graph](docs/DESIGN.md) · [X input](docs/SYNC_BOOKMARKS.md) · [Memory](docs/MEMORY.md) · [Contribute](CONTRIBUTING.md)

MIT · By [Milton / HeYan](https://github.com/MiltonHeYan). Existing xstash data paths and commands remain compatible.
