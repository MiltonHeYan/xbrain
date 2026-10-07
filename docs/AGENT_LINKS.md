# README Agent launch links

The README uses static HTML links, a table and existing Agent logos with available
dark-mode variants. GitHub sanitizes scripts and inline styles, so copying uses
GitHub's native code-block copy control. The other-Agents link scrolls to that
block; it does not claim to open or prefill another app.

## Verified behavior

- Cursor: `https://cursor.com/link/prompt?text=<URL-encoded prompt>` is documented
  in the [official deeplink reference](https://cursor.com/docs/reference/deeplinks).
  It requires user confirmation before execution. Browser verification reached
  the official “Preview Prompt” page with the complete decoded repository prompt
  and an “Open in Cursor” link. No prompt was submitted. Native app handoff and
  installation/sync execution were not tested.
- Each language encodes exactly the one-line prompt in its README. The referenced
  `SKILL.md` already exists on the repository's main branch.
- Desktop launch links and GitHub README links are different surfaces. A direct
  GitHub Markdown API check with harmless `hello` prompts removed the entire
  link target for all five tested schemes: `claude:`, `claude-cli:`, `codex:`,
  `cursor:` and `vscode:`. They rendered as plain text, not clickable links.
  Cursor's documented HTTPS wrapper survives. The other named Agent entries
  therefore link to the copyable prompt; no unsupported redirect service is used.
- Codex, Claude Code and OpenClaw have individually labeled copy entries with
  existing marks. Claude, VS Code, Hermes and other Agents share the same copy
  fallback. This does not imply those applications lack their own deep links.
  Desktop handlers were not executed, and no app was installed or authenticated.
- [GitHub's markup pipeline](https://github.com/github/markup) explains its HTML
  sanitization. The README does not depend on JavaScript, custom CSS, clipboard
  handlers or `cursor://` links surviving GitHub sanitization.
