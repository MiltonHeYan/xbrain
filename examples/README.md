# Synthetic examples

All people, posts, timestamps, IDs, and summaries here are fictional. No real
account response or credentials are included. The nonnumeric `sample-*` IDs
intentionally avoid creating links to potentially real X posts.

- `synthetic-bookmarks.json`: normalized v1 envelope with three records. Supplied
  summaries/tags are labeled `imported`, not verified agent output.
- `synthetic-x-response.json`: a raw X-shaped response with one record and an
  obviously fictional continuation token. It demonstrates the incomplete-coverage
  warning; the token is not usable and does not authorize pagination.

Run examples against a separate scratch store when you do not want to mix them
with your own collection. See the main README for `--store` and `BOOKMARK_STORE`.
