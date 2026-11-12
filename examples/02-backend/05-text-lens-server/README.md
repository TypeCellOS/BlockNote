# Text lens server

An HTTP server that gives BlockNote documents as BlockNote JSON, markdown, HTML and plain text, and accepts changed documents back in each format. It uses the text lens of `@blocknote/xl-ai/text-lens`.

A write does not replace the document. It applies only the changes, and keeps the data that the format does not show: block IDs, colors, alignment, styles, nesting, hidden blocks and comments. If two clients edit the same version, the second write keeps the changes of the first write.

## Run

```bash
pnpm install
pnpm --filter @blocknote/example-backend-text-lens-server start
```

The server listens on port 3010 (set `PORT` for a different port). It keeps the documents in memory. A new document ID gives a new document with sample content.

## API

| Request                      | Result                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /documents/:id/:format` | The document as `json`, `markdown`, `html` or `text`. The `ETag` header gives its version, for example `"1"`.                                   |
| `PUT /documents/:id/:format` | Writes the changed document back. The response gives the document after the write, the ETag of its version (`etag`), the operations and the warnings. |

A write sends the ETag that the client read in one of two headers:

| Header                    | Write                                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `If-Match: "1"`           | A strict write. If another writer changed the document after that version, nothing applies (412).                                                                      |
| `Base-Version: "1"`       | A merge. The write keeps the changes that other writers made after that version. If both changed the same part, the change of the other writer stays, with a warning. |
| `On-Conflict: reject`     | With `Base-Version` only: a merge with a conflict does not apply (409, with the conflicts). The default is `keep-current`.                                              |
| (none)                    | The write applies to the current document, without a merge.                                                                                                            |

The response of a write is JSON: `etag`, the document after the write (`text` for a text format, `document` for `json`), `operations` and `warnings`. The document after the write has the changes of other writers too. For the next write, change this document and send this ETag.

| Status | Error                              | Cause                                                                                                                                                   |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `invalid-json`                     | The body of a `json` write is not JSON.                                                                                                                 |
| 400    | `invalid-document`                 | The body is not a document for the schema (for example a JSON block of an unknown type, or an HTML table cell that spans more rows than the table has). |
| 400    | `on-conflict-without-base-version` | `On-Conflict` without `Base-Version`.                                                                                                                   |
| 400    | `unknown-on-conflict`              | `On-Conflict` is not `keep-current` or `reject`.                                                                                                        |
| 404    | `unknown-format`                   | The format is not `json`, `markdown`, `html` or `text`.                                                                                                 |
| 409    | `unknown-base-version`             | `Base-Version` does not give an ETag of a version of the document.                                                                                     |
| 409    | `conflict`                         | `On-Conflict: reject`, and the merge has a conflict. The body has the conflicts. Nothing applies.                                                      |
| 412    | `document-changed`                 | `If-Match` does not match the current version. Nothing applies.                                                                                         |

The ETags follow RFC 9110:

- The ETag is the version number of the document (Section 8.8.3 gives an internal revision number as an example). Each format has its own URL, thus the same ETag for each format is correct (Section 8.8.1). The ETag names the version of the document, thus an ETag from a markdown read also works for a JSON write.
- `If-Match` uses the strong comparison (Section 13.1.1): a weak ETag (`W/"1"`) never matches. `*` matches each version.
- A write response gives the new ETag in its body, not in an `ETag` header. The server stores the merge of the write, not the content of the request, and Section 9.3.4 then does not allow a validator field in the response.
- The server checks the headers (400, 404, 409) before `If-Match` (412), as Section 13.2.1 requires.
- A strong ETag must change when the text of a format changes. The text of a version changes only with a new version of the server (for example a changed markdown export). A real server that caches responses (`If-None-Match`) also puts the version of its serializer in the ETag.

## Example

```bash
# Read the document. The response header ETag is "1".
curl -i http://localhost:3010/documents/demo/markdown

# Write a changed text back, as a merge from version "1".
curl -X PUT -H 'Base-Version: "1"' \
  --data-binary $'# Welcome back\n\nRead this document as markdown, HTML or plain text, and write it back.\n' \
  http://localhost:3010/documents/demo/markdown

# The paragraph keeps its blue text color, although markdown does not show it.
curl http://localhost:3010/documents/demo/json

# A strict write from version "1" now fails with 412: the document is at version "2".
curl -i -X PUT -H 'If-Match: "1"' --data-binary 'Hello' http://localhost:3010/documents/demo/text
```

## How it works

- `src/dom.ts` installs a DOM for the markdown and HTML conversions of BlockNote.
- `src/documents.ts` keeps each document in a BlockNote editor, and keeps every version as BlockNote JSON. A real server keeps the versions in a database, or uses a Y.Doc and `@blocknote/xl-ai/text-lens/yjs`.
- `src/app.ts` has the routes. A write calls `updateDocument`, with `{ format, text }` for a text format or `{ document }` for JSON, with the document of the base version as `base` and the `onConflict` of the client. After the server reads the body, a write is synchronous from the checks until its commit. Thus, two writes cannot mix, and no write comes between the check of `If-Match` and the commit.

A real server also needs authentication. The body of a request can be at most 5 MB.

The JSON route rejects a tree with more than 100 levels. The text routes have no limit for the nesting: the markdown and HTML parsers of BlockNote use recursion for nested blocks. Thus, a very deep nesting in a text (for example 20,000 quote markers in markdown) overflows the stack of the parser, and the response is 500. A deep HTML list can take many seconds. A real server must parse untrusted text in a worker, with a time limit.
