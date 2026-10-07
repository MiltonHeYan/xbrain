# README Agent launch links

The README uses static HTML links, a table and the existing Cursor logo with its
dark-mode variant. GitHub sanitizes scripts and inline styles, so copying uses
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
- No suitable official generic prefill contract was confirmed for Codex,
  Claude Code or OpenClaw during this check. They use the copy/paste fallback;
  this is not a claim that these products cannot support such links.
- [GitHub's markup pipeline](https://github.com/github/markup) explains its HTML
  sanitization. The README does not depend on JavaScript, custom CSS, clipboard
  handlers or `cursor://` links surviving GitHub sanitization.
