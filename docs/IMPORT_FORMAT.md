# Import format and merge contract

格式的最终依据是 `src/shared/bookmarks.ts`。本文件解释 v1 原型的输入、限制与合并方式；所有示例均为虚构数据。

## Supported inputs

A JSON file or pasted JSON may contain:

1. A bookmark array: `[{"id":"sample-1","text":"Fictional content"}]`.
2. An envelope with `bookmarks: [...]`.
3. An X-style response with `data: [...]`, optional `includes.users` and
   `includes.media`, and optional `meta`.
4. A tool wrapper containing a single JSON text block in `content`, or a
   `structuredContent` payload. Tool errors are rejected before data is imported.

Only JSON is supported. This is not an importer for every X account archive,
HTML export, CSV file, or third-party bookmark format. An X archive with a
different structure needs an explicit, reviewed conversion first.

Standard snapshots are limited to 10 MiB and 10,000 input rows, including rows
that would later be skipped or deduplicated. Nested wrappers are bounded.

A version 1 collection backup with `version: 1` or `schemaVersion: 1` and a
`bookmarks` array can be merged with `node cli.mjs restore BACKUP`. That path
accepts up to 100 MiB / 50,000 rows. Invalid or duplicate backup IDs and conflicting
version fields are rejected rather than silently dropping backup records.
Ordinary UI imports retain the smaller snapshot limit. Restore is a merge, not a
destructive replacement. An empty backup is rejected with the existing library unchanged.

## Recommended envelope

```json
{
  "schemaVersion": 1,
  "source": { "provider": "x", "coverage": "partial" },
  "bookmarks": [
    {
      "id": "sample-format-1",
      "text": "Fictional example: write small tests around explicit behavior.",
      "author": { "name": "Fictional Author", "username": "" },
      "url": "",
      "createdAt": "2026-01-01T10:00:00Z",
      "savedAt": "2026-01-02T10:00:00Z",
      "tags": ["Testing"],
      "summary": "Fictional sample summary about focused tests.",
      "media": [],
      "note": "My local note.",
      "favorite": true,
      "enrichment": { "kind": "imported" }
    }
  ]
}
```

The importer does not retain arbitrary extra fields, unknown source metadata,
credentials, raw tool responses, or continuation tokens in the normalized
library. A normalized library is not a lossless archive of the original input.

## Record fields

- `id` is required. Prefer a string. Accepted characters are letters, digits,
  underscore and hyphen, with length 1–128. Safe JSON integers are converted to
  strings; unsafe numbers are skipped because their precision is already lost.
  `id_str` and `tweet_id` are accepted alternatives.
- `text` is plain text; `full_text` is an alternative. Control characters are
  removed and long text is capped at 20,000 characters. Missing text stays empty
  for a new record. A repeated import that omits text preserves prior text.
- `author` accepts `name` and `username`. Legacy `user` / `screen_name` and X
  `includes.users`, matched by `author_id`, are supported. Handles must be valid
  X-style handles of 1–15 letters, digits, or underscores. Missing identity is
  shown as unknown; an author ID is not evidence of a display name.
- `url` accepts HTTPS URLs without embedded credentials, up to 4,096 characters.
  For a numeric post ID, a canonical X status URL may be derived from the ID and
  returned handle, or `x.com/i/status/ID`. A generated URL does not verify that
  the post is still available. Nonnumeric synthetic IDs have no fallback URL.
- `createdAt` / `created_at` is the source post timestamp when supplied and valid.
  Missing dates stay unknown. `savedAt` is the first local save/import timestamp
  when no valid value is supplied; it does **not** claim when X was bookmarked.
- `tags` is an array of plain-text strings, capped at 30 tags of 60 characters each. Duplicates are removed.
- `summary` is plain text, capped at 4,000 characters. A supplied summary is not automatically AI-generated.
- `media` is an array of objects with `url`, `type`, and optional `alt`. Up to
  eight safe HTTPS entries are kept. X `attachments.media_keys` are joined with
  `includes.media` if provided. A `preview_image_url` is treated as an image;
  an actual video URL can retain `type: "video"`. The viewer does not provide a
  video player or download/archive remote media.
- `note` is optional plain text, capped at 10,000 characters.
- `favorite` is accepted only as a Boolean.
- `sourceFields` tracks whether text, author, media and explicit URL metadata
  were present. It is generated automatically; agents should normally omit it.
  Normalized backups retain it to preserve future merge behavior.

In ordinary snapshots, invalid rows are skipped with warnings and duplicate IDs
keep the final normalized row. Backup restoration instead rejects invalid or
duplicate IDs. A successful snapshot can still be incomplete.

## Enrichment provenance

`enrichment.kind` is one of:

- `none`: no supplied summary or tags
- `imported`: annotations arrived in a file without valid agent provenance
- `agent`: the file declares a nonempty `agent` name and valid `generatedAt`
- `user`: annotations have been explicitly edited by a user

For actual agent-generated content, supply:

```json
{
  "kind": "agent",
  "agent": "Actual agent or model used",
  "generatedAt": "2026-01-02T10:00:00Z",
  "basis": "Imported post text only"
}
```

The example is a format illustration. Replace the name, timestamp and basis
with the real values. Merely importing this object does not run a model or
prove who wrote the summary. Provenance is a declaration, not a cryptographic
signature or factual accuracy check. Do not give human-authored/imported sample
text an AI label to make the demo look more capable.

## Merge semantics

Records are matched by ID. New IDs are added. Existing IDs refresh supplied
source content while preserving:

- First `savedAt`
- Existing `note` and `favorite`, including empty notes and `false`
- Existing tags, summary and provenance if the record is already annotated
- Hydrated author/media when a later snapshot omits those expansions
- Existing timestamp when a later source timestamp is missing

An explicit `media: []` clears media. An omitted media field preserves prior
hydrated media. The same distinction is why `sourceFields` is retained.

A raw record with `kind: none`, empty tags, and no summary may receive annotations
on a later import. Once annotated, later generated/imported annotations do not
overwrite it. Edit the summary and tags in the UI to change them. Explicitly
clearing them in the UI marks the record `user`, protecting even those blanks.

A snapshot never deletes records missing from that snapshot. A restore into an
existing library uses these same rules; restore into a new path to create a
clean normalized copy of a backup. The backup itself is not overwritten.

## Coverage

All imports are labeled partial. A returned `meta.next_token` produces an
additional incomplete-coverage warning. The CoreSpeed bookmark schema checked
on 2026-10-02 had no pagination input; clients must check the current tool schema
rather than fabricate one. A collection can accumulate several snapshots, but
that alone does not prove full coverage of an X account.
