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

| Request                      | Result                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /documents/:id/:format` | The document as `json`, `markdown`, `html` or `text`. The `Document-Version` header gives its version.                           |
| `PUT /documents/:id/:format` | Writes the changed document back. The response gives the document after the write, its version, the operations and the warnings. |

For a write, send the version that the client read in the `Base-Version` header. Then the server merges the write with the changes that other writers made after that version. Without the header, the write applies to the current document.

The response of a write is JSON: `version`, the document after the write (`text` for a text format, `document` for `json`), `operations` and `warnings`. The document after the write has the changes of other writers too. For the next write, change this document and send this version as `Base-Version`.

| Status | Error                  | Cause                                                                                                                                                   |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `invalid-json`         | The body of a `json` write is not JSON.                                                                                                                 |
| 400    | `invalid-document`     | The body is not a document for the schema (for example a JSON block of an unknown type, or an HTML table cell that spans more rows than the table has). |
| 404    | `unknown-format`       | The format is not `json`, `markdown`, `html` or `text`.                                                                                                 |
| 409    | `unknown-base-version` | The `Base-Version` header does not give a version of the document.                                                                                      |

The server does not use `If-Match`, because RFC 9110 requires the status 412 for a stale `If-Match`. This server merges a stale write.

## Example

```bash
# Read the document. The response header Document-Version is 1.
curl -i http://localhost:3010/documents/demo/markdown

# Write a changed text back, from version 1.
curl -X PUT -H "Base-Version: 1" \
  --data-binary $'# Welcome back\n\nRead this document as markdown, HTML or plain text, and write it back.\n' \
  http://localhost:3010/documents/demo/markdown

# The paragraph keeps its blue text color, although markdown does not show it.
curl http://localhost:3010/documents/demo/json
```

## How it works

- `src/dom.ts` installs a DOM for the markdown and HTML conversions of BlockNote.
- `src/documents.ts` keeps each document in a BlockNote editor, and keeps every version as BlockNote JSON. A real server keeps the versions in a database, or uses a Y.Doc and `@blocknote/xl-ai/text-lens/yjs`.
- `src/app.ts` has the routes. A write calls `updateDocument`, with `{ format, text }` for a text format or `{ document }` for JSON, with the document of the base version as `base`. After the server reads the body, a write is synchronous until its commit. Thus, two writes cannot mix.

A real server also needs authentication. The body of a request can be at most 5 MB.

The JSON route rejects a tree with more than 100 levels. The text routes have no limit for the nesting: the markdown and HTML parsers of BlockNote use recursion for nested blocks. Thus, a very deep nesting in a text (for example 20,000 quote markers in markdown) overflows the stack of the parser, and the response is 500. A deep HTML list can take many seconds. A real server must parse untrusted text in a worker, with a time limit.
