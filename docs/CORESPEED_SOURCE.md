# Optional CoreSpeed X source adapter

This adapter is explicitly selected; it is not the default source or a memory
backend. The resource-memory core remains provider-neutral. Credentials stay in
the user's existing official client/connector. This adapter never calls login,
token export, key creation, remote memory writes or X mutation tools.

Official reference: [CoreSpeed CLI](https://corespeed.io/docs/cli) and
[cs mcp](https://corespeed.io/docs/cli/mcp). The inspected bookmark tool accepts
`account` and `max_results`; no pagination input was exposed. Both modes therefore
use `pagination: "single"`, `incremental: "rescan"`, and report partial coverage.
A next token in the response is not treated as permission to invent parameters.
Unknown source modification times remain null; post creation time is not an edit version.

## Mode A: official CLI with an existing sign-in

Use a trusted installed official `cs` executable (or its absolute Node entrypoint).
The CLI session must already exist; a connected Agent does not imply CLI login.
Choose the account explicitly in source config:

```json
{
  "kind":"command", "scope":"personal", "provider":"x",
  "account":"@yourHandle", "pagination":"single", "incremental":"rescan",
  "timeoutMs":60000,
  "command":["/absolute/path/to/node", "/absolute/xrecall/scripts/corespeed-source.mjs",
    "--cli", "/absolute/path/to/cs", "--max-results", "12"]
}
```

For a CLI distributed as JavaScript, `--cli /absolute/path/to/@corespeed/cs/dist/index.js`
is supported; the adapter uses its current Node runtime. It calls the documented
`cs mcp call manage__accounts_list '{}' --raw`, checks the selected identity and
`member_scope: true`, reads `cs mcp get twitter__get_my_bookmarks --json`, then calls
that tool with only account/max_results and `--raw`. No account is substituted.
A changed required schema fails closed instead of guessing inputs.

CLI auth/approval/refusal/network errors stop that run. There is no automatic
fallback between modes, account switch or token extraction. `authorization_required`
means existing CLI sign-in is unavailable; `access_denied` can include a tool refusal
or approval gate; `unavailable` includes network/invalid-response failures. Raw
stderr is not printed because it could contain private data. Use the official
client's private diagnostics to identify the exact issue. Do not retry a denied
operation through another transport to bypass approval.

## Mode B: Agent-mediated official MCP snapshot

Use this when the user explicitly selects the already connected official Agent
MCP client. The Agent performs live tool calls; the adapter only validates and
consumes the fresh local handoff. It does **not** itself contact X or authenticate.
This mode is not a workaround for denied access, an account refusal or an approval
block. Its authority is the user's selected, successfully authorized MCP call.

1. Call `manage__accounts_list`. Match the exact requested alias and identity,
   with `connector: "twitter"` and `member_scope: true`. Never use an organization
   account after a personal-account failure.
2. Inspect the actual bookmark tool schema. Call `twitter__get_my_bookmarks`
   with the verified `account` and the authorized bounded `max_results`.
   Check `isError` before extracting data. Stop on auth, access, billing or approval
   failures; do not make a success-looking snapshot from an error.
3. Write the following envelope into a private 0700 directory outside the repo,
   with a 0600 file. Preserve string IDs and returned text. Record the actual
   response receipt time. An unused pagination token may be omitted; never include
   credentials. Do not refresh a stale snapshot merely by changing its timestamp.

```json
{
  "format":"xstash.corespeed-snapshot.v1",
  "account":"@yourHandle",
  "fetchedAt":"<actual ISO response-receipt time>",
  "accounts":[{"connector":"twitter","alias":"@yourHandle","identity":"@yourHandle","member_scope":true}],
  "result":{"isError":false,"content":[{"type":"text","text":"<JSON-encoded actual X response>"}]}
}
```

4. Select snapshot mode explicitly in source config:

```json
{
  "kind":"command", "scope":"personal", "provider":"x",
  "account":"@yourHandle", "pagination":"single", "incremental":"rescan",
  "command":["/absolute/path/to/node", "/absolute/xrecall/scripts/corespeed-source.mjs",
    "--snapshot", "/private/source-snapshot.json", "--max-results", "12"]
}
```

5. Run `pull --source-config FILE --store PRIVATE_STORE`, then `pending` and
   Agent-authored `distill`, following [the manual workflow](SYNC_BOOKMARKS.md).
   To test a real repeat fetch, call the official MCP tool again and replace the
   private snapshot with the new successful result before the second pull.
   Replaying the same file only tests local replay, not fresh source access.

The adapter rejects snapshots older than 30 minutes, future timestamps, mismatched
accounts, organization scope, tool errors, unsafe numeric IDs, malformed rows and
more rows than the selected limit. Snapshot provenance is an Agent assertion, not
cryptographic authentication; runtime checks cannot prove where arbitrary JSON
came from. Keep the actual successful tool call as the acceptance evidence.
Only the user's stated save reason may be saved; unknown reasons remain null.

## Verification claims

Synthetic tests cover snapshot validation, identity/scope rejection, freshness,
CLI command order/schema checks and refusal handling. Live acceptance should report
which transport succeeded, exact returned counts, deduplication, reviewed entries,
retrieval/citation checks and any unfinished paths. A working native MCP snapshot
must not be described as proof that the official CLI network path works.
No credentials, live snapshots, account-response files or private acceptance stores
belong in the repository, patch, fixtures or PR attachments.
