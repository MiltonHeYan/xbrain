# README hero artwork

`xrecall-hero.svg` is the editable desktop composition; `xrecall-hero-mobile.svg`
is the stacked mobile composition. Both have an opaque pure-white background.
The matching PNGs are exported at 2x (2400×1480 and 1440×2740).

The illustration explains an Agent-led workflow, not an application screenshot:
authorized bookmarks → local purpose/context/limitations → task-time retrieval,
applicability checks and original-source citation. The keyboard-navigation/dialog
example is fictional. No private bookmarks, account details, credentials, remote
memory provider or automatic background synchronization are depicted.

## Brand provenance

- `x-official.svg` is the unchanged white X mark fetched on 2026-10-07 from the
  [official X developer documentation](https://docs.x.com). Its page references
  [this exact SVG asset](https://mintcdn.com/x-preview/CX6FNhUUR8mtNZ97/logo/logo.svg?fit=max&auto=format&n=CX6FNhUUR8mtNZ97&q=85&s=fc98f7530107933ed253f413fbfadf72).
  The SVG is embedded unchanged on a black tile, preserving its aspect ratio.
- Cursor and the OpenAI mark used for Codex reuse `../agents/cursor.svg` and
  `../agents/openai.svg`, without altering paths or colors. Their provenance and
  trademark notices are in [Agent mark sources](../agents/README.md).
- The document outline is a generic UI glyph, not a product logo. The xrecall
  name is typeset text, not an invented brand symbol. No CoreSpeed logo appears.

Marks identify the source and example Agent tools; they do not imply affiliation
or endorsement. Their owners retain trademark rights. The project MIT license
must not be read as relicensing third-party marks.

## Editing and export

Run `python3 docs/assets/hero/build-hero.py` from the repository root to regenerate
both SVGs. It reads only the checked-in logo assets and contains all copy/layout
values. It does not fetch anything or access a user's library.

The checked-in PNGs were rendered with `@resvg/resvg-js` 2.6.2, Arial system fonts,
`loadSystemFonts: true`, and `fitTo: { mode: 'zoom', value: 2 }`. This optional
artwork tool is not an application dependency. Review both rendered sizes before
replacing the PNGs. The README `picture` selects the mobile PNG at 600px or below.

## Generated visual, version 2

`hero-v2-generated.png` was created with the built-in image_gen tool (not an API
or paid CLI fallback). Its full prompt is in `hero-v2-prompt.txt`. It contains no
brand logos. The paper/folio/task scene is conceptual artwork, not a screenshot
or a claim of automatic synchronization.

`compose-hero-v2.cjs` embeds the original X, Cursor and OpenAI SVG paths over the
reserved blank areas, then adds exact title/labels. Thus no brand mark is
AI-redrawn. With @resvg/resvg-js 2.6.2 available on NODE_PATH, run the script to
rebuild `xrecall-hero-v2.png` (1536×1024). The old vector illustrations are retained
as earlier alternatives. README references now select the generated v2 visual.
