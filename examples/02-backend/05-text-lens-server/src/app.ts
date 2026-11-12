import type { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import {
  type ChangeOperations,
  type ChangeResult,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  type MergeWarning,
  plainTextFormat,
  type TextFormat,
  updateDocument,
} from "@blocknote/xl-ai/text-lens";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import type { DocumentStore } from "./documents.js";

/** A format of the API: BlockNote JSON, or a text format of the text lens. */
type Format =
  | { type: "json" }
  | { type: "text"; format: TextFormat; contentType: string };

/** The formats, by the name in the URL. */
const formats: Record<string, Format> = {
  json: { type: "json" },
  markdown: {
    type: "text",
    format: markdownFormat,
    contentType: "text/markdown; charset=utf-8",
  },
  html: {
    type: "text",
    format: htmlFormat,
    contentType: "text/html; charset=utf-8",
  },
  text: {
    type: "text",
    format: plainTextFormat,
    contentType: "text/plain; charset=utf-8",
  },
};

/** The format with a name from the URL. `Object.hasOwn` ignores names like `toString`. */
function formatOf(name: string): Format | undefined {
  return Object.hasOwn(formats, name) ? formats[name] : undefined;
}

/**
 * The ETag of a version of the document, for example `"3"`. A GET gives it in
 * the `ETag` header, and a PUT in its body. The client sends it back in
 * `If-Match` or in `Base-Version`. The ETag is the version of the document,
 * thus all formats of a document give the same ETag for the same version.
 */
function etagOf(version: number): string {
  return `"${version}"`;
}

/** The ETag of the version that the client read before it changed the text. With it, the server merges. */
const BASE_HEADER = "Base-Version";
/** What a conflict of the merge does: `keep-current` (the default) or `reject`. Only with `Base-Version`. */
const ON_CONFLICT_HEADER = "On-Conflict";

/** An error of the client, as a value: the HTTP status and a code. */
type ClientError = {
  status: 400 | 404 | 409 | 412;
  error: string;
  conflicts?: MergeWarning[];
};

/**
 * An HTTP API for documents, with the text lens:
 *
 * - `GET /documents/:id/:format` gives the document as `json`, `markdown`,
 *   `html` or `text`, with the ETag of its version.
 * - `PUT /documents/:id/:format` writes a changed document back. The write
 *   applies only the changes, and keeps the data that the format does not
 *   show. The client sends the ETag that it read in one of two headers:
 *   - `If-Match`: a strict write. If another writer changed the document
 *     after that version, the write does not apply (412).
 *   - `Base-Version`: a merge. The write keeps the changes that other
 *     writers made after that version. With `On-Conflict: reject`, a write
 *     with a conflict does not apply (409, with the conflicts).
 *   The response gives the document after the write (with the changes of
 *   other writers), and in its body the ETag of that version, for the next
 *   write.
 */
export function createApp(store: DocumentStore) {
  const app = new Hono();
  app.use("/documents/*", bodyLimit({ maxSize: 5 * 1024 * 1024 }));

  app.get("/documents/:id/:format", (c) => {
    const format = formatOf(c.req.param("format"));
    if (format === undefined) {
      return c.json({ error: "unknown-format" }, 404);
    }
    const { editor, version } = store.current(c.req.param("id"));
    c.header("ETag", etagOf(version));
    if (format.type === "json") {
      return c.json(editor.document);
    }
    return c.body(getDocumentText(editor, format.format), 200, {
      "Content-Type": format.contentType,
    });
  });

  app.put("/documents/:id/:format", async (c) => {
    const format = formatOf(c.req.param("format"));
    if (format === undefined) {
      return c.json({ error: "unknown-format" }, 404);
    }
    const body = await c.req.text();
    // From here, the handler is synchronous. Thus, no other write can change
    // the document between the checks, this write and its commit.
    const id = c.req.param("id");
    const { editor, version } = store.current(id);
    const options = readWriteOptions(
      c.req.header(BASE_HEADER),
      c.req.header(ON_CONFLICT_HEADER),
      store,
      id,
    );
    if ("error" in options) {
      return c.json({ error: options.error }, options.status);
    }
    // The precondition comes after the other client errors (RFC 9110, 13.2.1).
    if (!ifMatches(c.req.header("If-Match"), etagOf(version))) {
      return c.json({ error: "document-changed" }, 412);
    }
    const result = write(editor, format, body, options);
    if (result.error !== undefined) {
      const { status, error, conflicts } = result;
      return c.json(conflicts ? { error, conflicts } : { error }, status);
    }
    const next = result.operations.length > 0 ? store.commit(id) : version;
    // The new ETag is in the body, not in an ETag header: the stored document
    // is not the content of the request (it merged, and the format changes
    // the text), thus RFC 9110 (9.3.4) does not allow the header here.
    return c.json({ etag: etagOf(next), ...read(editor, format), ...result });
  });

  return app;
}

/** The document in a format, for the body of a write response. */
function read(
  editor: BlockNoteEditor<any, any, any>,
  format: Format,
): { document: Block<any, any, any>[] } | { text: string } {
  return format.type === "json"
    ? { document: editor.document }
    : { text: getDocumentText(editor, format.format) };
}

/** The `base` and `onConflict` of a write (see `WriteFromVersion` of the text lens). */
type WriteOptions =
  | { base: "current" }
  | { base: Block<any, any, any>[]; onConflict: "keep-current" | "reject" };

/** Applies the body of a PUT request to the document. */
function write(
  editor: BlockNoteEditor<any, any, any>,
  format: Format,
  body: string,
  options: WriteOptions,
): ChangeOperations | ClientError {
  if (format.type === "text") {
    return orClientError(
      updateDocument(editor, {
        format: format.format,
        text: body,
        ...options,
      }),
    );
  }
  const document = parseDocument(body);
  if ("error" in document) {
    return document;
  }
  return orClientError(
    updateDocument(editor, { document: document.blocks, ...options }),
  );
}

/**
 * The update, or a client error: 400 if the text or the JSON does not fit
 * the schema, 409 for a rejected conflict.
 */
function orClientError(update: ChangeResult): ChangeOperations | ClientError {
  switch (update.error) {
    case undefined:
      return update;
    case "invalid-document":
      return { status: 400, error: update.error };
    case "conflict":
      return { status: 409, error: update.error, conflicts: update.conflicts };
  }
}

/**
 * Reads the `Base-Version` and `On-Conflict` headers. Without `Base-Version`,
 * the write applies to the current document, and `On-Conflict` is an error.
 */
function readWriteOptions(
  baseHeader: string | undefined,
  onConflictHeader: string | undefined,
  store: DocumentStore,
  id: string,
): WriteOptions | ClientError {
  if (baseHeader === undefined) {
    return onConflictHeader === undefined
      ? { base: "current" }
      : { status: 400, error: "on-conflict-without-base-version" };
  }
  const onConflict = onConflictHeader ?? "keep-current";
  if (onConflict !== "keep-current" && onConflict !== "reject") {
    return { status: 400, error: "unknown-on-conflict" };
  }
  const match = /^"(\d+)"$/.exec(baseHeader);
  const base = match === null ? undefined : store.version(id, Number(match[1]));
  return base === undefined
    ? { status: 409, error: "unknown-base-version" }
    : { base, onConflict };
}

/**
 * Returns true if the `If-Match` header matches the ETag of the current
 * version, or if the request has no `If-Match`. The header is `*` or a list
 * of ETags. The comparison is strong (RFC 9110): a weak ETag never matches.
 */
function ifMatches(header: string | undefined, etag: string): boolean {
  return (
    header === undefined ||
    header
      .split(",")
      .map((tag) => tag.trim())
      .some((tag) => tag === "*" || tag === etag)
  );
}

/**
 * Parses a JSON body: an array of blocks. This checks only the shape of the
 * tree, for the types. `updateDocument` checks the blocks against
 * the schema.
 */
function parseDocument(
  body: string,
): { blocks: PartialBlock<any, any, any>[] } | ClientError {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { status: 400, error: "invalid-json" };
  }
  if (!isBlockList(json)) {
    return { status: 400, error: "invalid-document" };
  }
  return { blocks: json };
}

/** The maximum nesting depth of a JSON document. */
const MAX_DEPTH = 100;

/** Checks the full tree without recursion, and at most `MAX_DEPTH` levels deep. */
function isBlockList(value: unknown): value is PartialBlock<any, any, any>[] {
  const lists: { list: unknown; depth: number }[] = [{ list: value, depth: 1 }];
  for (let next = lists.pop(); next !== undefined; next = lists.pop()) {
    const { list, depth } = next;
    if (!Array.isArray(list) || depth > MAX_DEPTH) {
      return false;
    }
    for (const block of list) {
      if (typeof block !== "object" || block === null || Array.isArray(block)) {
        return false;
      }
      const { id, type, children } = block as Record<string, unknown>;
      if (
        (id !== undefined && typeof id !== "string") ||
        (type !== undefined && typeof type !== "string")
      ) {
        return false;
      }
      // `null` children are no children, as in the lens.
      if (children !== undefined && children !== null) {
        lists.push({ list: children, depth: depth + 1 });
      }
    }
  }
  return true;
}
