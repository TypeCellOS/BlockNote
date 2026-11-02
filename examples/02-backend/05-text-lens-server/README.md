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

| Request                      | Result                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /documents/:id/:format` | The document as `json`, `markdown`, `html` or `text`. The `Document-Version` header gives its version. |
| `PUT /documents/:id/:format` | Writes the changed document back. The response gives the new version, the operations and the warnings. |

For a write, send the version that the client read in the `Base-Version` header. Then the server merges the write with the changes that other writers made after that version. Without the header, the write applies to the current document. An unknown base version gives the status 409.

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
- `src/app.ts` has the routes. A text write calls `updateDocumentFromText`, and a JSON write calls `updateDocumentFromJSON`, with the document of the base version as `base`.

A real server also needs authentication. The body of a request can be at most 5 MB.
