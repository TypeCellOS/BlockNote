# Text lens server

An HTTP server that gives BlockNote documents as BlockNote JSON, markdown, HTML and plain text, and accepts changed documents back in each format. It uses the text lens of `@blocknote/xl-ai/text-lens`.

A write does not replace the document. It applies only the changes, and keeps the data that the format does not show: block IDs, colors, alignment, styles, nesting, hidden blocks and comments. If two clients edit the same version, the second write does not remove the changes of the first write: a strict write does not apply, and a merge keeps the changes of the two clients.

## Run

```bash
pnpm install
pnpm --filter @blocknote/example-backend-text-lens-server start
```

The server listens on port 3010 (set `PORT` for a different port). It keeps the documents in memory. A new document ID gives a new document with sample content.

## API

| Request                      | Result                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /documents/:id/:format` | The document as `json`, `markdown`, `html` or `text`. The `ETag` header gives its version, for example `"1"`.                                                                |
| `PUT /documents/:id/:format` | Writes the changed document back. The response gives the ETag of the document that the client wrote (`etag`), the operations, the warnings and the changes of other writers. |

A write sends the ETag of the text of the client in one of two headers. This is the ETag of the read that gave the text, or the ETag of the last write of the client:

| Header                      | Write                                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `If-Match: "1"`             | A strict write. If another writer changed the document after that version, nothing applies (412). This is the recommended write.                                                               |
| `Base-Version: "1"`         | A merge. The write keeps the changes that other writers made after that version. If both changed the same part (a conflict), nothing applies (409, with the conflicts).                        |
| `On-Conflict: keep-current` | With `Base-Version` only: in a conflict, the change of the other writer stays, with a warning, and the other changes of the client apply. The default is `reject`: a conflict stops the write. |
| (none)                      | The write applies to the current document, without a check and without a merge. If another writer changed the document after the read of the client, the write changes the shown data back.    |

The merge is experimental: its rules can change, and it has known wrong results (see the README of the text lens, "The merge write"). After a 412, read the document again, make the change in the new text, and write again.

The response of a write is JSON: `etag`, `operations`, `warnings` and `changesOfOthers` (the blocks that other writers changed after `Base-Version`; empty without a merge).

### The version of a write

- **Use the `etag` of the response as the base of the next write.** It names the document that the client wrote: the text that the client has, without the changes of other writers. If no other writer changed the document, it is the ETag of the current document. For the next write, the client changes its own text and sends this ETag in `If-Match` or in `Base-Version`.
- **An ETag is opaque.** A client must not compute the ETag of the next version: after a merge, the server keeps the document that the client wrote as a version of its own, with its own number.
- **How long an ETag is valid.** An ETag in `If-Match` has no time limit: the server only compares it with the ETag of the current version. An ETag in `Base-Version` is valid while the store keeps the document of that version. For a version that the store does not have, the response is 409 `unknown-base-version`. This example keeps each version in memory.

The response does not contain the document after the write. After a merge, that document has changes that the client did not see. A write of the text of the client with the ETag of that document would remove these changes without a warning. Thus, the rule is: an ETag names the document of the text that came with it. A read gives the current text and its ETag. A write gives the ETag of the text that the client sent. To get the changes of other writers, read the document again.

| Status | Error                              | Cause                                                                                                                                                   |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `invalid-json`                     | The body of a `json` write is not JSON.                                                                                                                 |
| 400    | `invalid-document`                 | The body is not a document for the schema (for example a JSON block of an unknown type, or an HTML table cell that spans more rows than the table has). |
| 400    | `on-conflict-without-base-version` | `On-Conflict` without `Base-Version`.                                                                                                                   |
| 400    | `unknown-on-conflict`              | `On-Conflict` is not `keep-current` or `reject`.                                                                                                        |
| 404    | `unknown-format`                   | The format is not `json`, `markdown`, `html` or `text`.                                                                                                 |
| 409    | `unknown-base-version`             | `Base-Version` does not give an ETag of a version of the document.                                                                                      |
| 409    | `conflict`                         | The merge has a conflict, and the request does not have `On-Conflict: keep-current`. The body has the conflicts. Nothing applies.                       |
| 412    | `document-changed`                 | `If-Match` does not match the current version. Nothing applies.                                                                                         |

The ETags follow RFC 9110:

- The ETag is the version number of the document (Section 8.8.3 gives an internal revision number as an example). Each format has its own URL, thus the same ETag for each format is correct (Section 8.8.1). The ETag names the version of the document, thus an ETag from a markdown read also works for a JSON write.
- `If-Match` uses the strong comparison (Section 13.1.1): a weak ETag (`W/"1"`) never matches. `*` matches each version.
- A write response gives its ETag in the body, not in an `ETag` header. After a merge, this ETag names the document that the client wrote, not the current document. Also, the server stores the merge of the write, not the content of the request, and Section 9.3.4 then does not allow a validator field in the response.
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
- `src/documents.ts` keeps each document in a BlockNote editor, and keeps every version as BlockNote JSON. After a write that merged, it also keeps the document that the client wrote (`written` of the text lens) as a version of its own. A real server keeps the versions in a database, or uses a Y.Doc and `@blocknote/xl-ai/text-lens/yjs`.
- `src/app.ts` has the routes. A write has `{ format, text }` for a text format, or `{ document }` for JSON. Without `Base-Version`, it calls `updateDocument` with `base: "current"`. With `Base-Version`, it calls `updateDocumentWithMerge`, with the document of the base version as `base` and the `onConflict` of the client. After the server reads the body, a write is synchronous from the checks until its commit. Thus, two writes cannot mix, and no write comes between the check of `If-Match` and the commit.
- `If-Match` is a compare of ETags: the server needs no stored document for it. A server without version numbers can do the same check in the lens: `updateDocument` with the document of the version as `base` gives the error `document-changed` if the document changed after that version.

A real server also needs authentication. The body of a request can be at most 5 MB.

The JSON route rejects a tree with more than 100 levels. The text routes have no limit for the nesting: the markdown and HTML parsers of BlockNote use recursion for nested blocks. Thus, a very deep nesting in a text (for example 20,000 quote markers in markdown) overflows the stack of the parser, and the response is 500. A deep HTML list can take many seconds. A real server must parse untrusted text in a worker, with a time limit.
