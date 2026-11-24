import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import {
  type BlockOperation,
  type ChangeWarning,
  getDocumentText,
  htmlFormat,
  type JSONChange,
  type LensBlock,
  markdownFormat,
  type MergeWarning,
  plainTextFormat,
  type TextChange,
  type TextFormat,
  updateDocument,
  updateDocumentWithMerge,
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
 * The ETag of a version, for example `"3"`. A GET gives the ETag of the
 * current document in the `ETag` header. A PUT gives the ETag of the document
 * that the client wrote in its body. The client sends an ETag back in
 * `If-Match` or in `Base-Version`. The ETag names a version of the document,
 * thus all formats of a document give the same ETag for the same version.
 *
 * For a client, the ETag is opaque: a client must not compute the ETag of
 * the next version.
 */
function etagOf(version: number): string {
  return `"${version}"`;
}

/** The ETag of the version that the text of the client starts from: from its last read, or from its last write. With it, the server merges. */
const BASE_HEADER = "Base-Version";
/** What a conflict of the merge does: `reject` (the default) or `keep-current`. Only with `Base-Version`. */
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
 *   show. The client sends the ETag of its text in one of two headers:
 *   - `If-Match`: a strict write. If another writer changed the document
 *     after that version, the write does not apply (412). The server
 *     compares the ETags. Thus, it needs no stored document, and this ETag
 *     has no time limit.
 *   - `Base-Version`: a merge (`updateDocumentWithMerge`). The write keeps
 *     the changes that other writers made after that version. A write with
 *     a conflict does not apply (409, with the conflicts), unless the client
 *     sends `On-Conflict: keep-current`. This ETag is valid while the store
 *     keeps the document of the version.
 *   The response gives the ETag of the document that the client wrote: its
 *   own text, without the changes of other writers. Use this version as the
 *   base of the next write. Thus, an ETag always names the document of the
 *   text that the client has: a GET gives the current text with its ETag,
 *   and a PUT gives the ETag of the text that the client sent.
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
    // The client has the text that it wrote. After a merge, the current
    // document also has the changes of other writers, which the client did
    // not see: a write of the text of the client from that version would
    // remove them. Thus the ETag names the document that the client wrote.
    const written =
      result.written === undefined ? next : store.keep(id, result.written);
    // The ETag is in the body, not in an ETag header: it does not always
    // name the current document, thus RFC 9110 (9.3.4) does not allow the
    // header here.
    return c.json({
      etag: etagOf(written),
      operations: result.operations,
      warnings: result.warnings,
      changesOfOthers: result.changesOfOthers,
    });
  });

  return app;
}

/**
 * The write of a request: to the current document, or a merge from the
 * version `base` (see `MergeFromVersion` of the text lens).
 */
type WriteOptions =
  | { base: "current" }
  | { base: LensBlock[]; onConflict: "keep-current" | "reject" };

/** A write that applied: the data of the response. */
type AppliedWrite = {
  error?: undefined;
  operations: BlockOperation[];
  warnings: ChangeWarning[];
  /** The changes of other writers after `Base-Version`, as operations. Empty without a merge. */
  changesOfOthers: BlockOperation[];
  /**
   * The document that the client wrote, if it is not the document after the
   * write: a merge kept changes of other writers.
   */
  written: LensBlock[] | undefined;
};

/** Applies the body of a PUT request to the document. */
function write(
  editor: BlockNoteEditor<any, any, any>,
  format: Format,
  body: string,
  options: WriteOptions,
): AppliedWrite | ClientError {
  const change = readChange(format, body);
  if ("error" in change) {
    return change;
  }
  if (options.base === "current") {
    const update = updateDocument(editor, change);
    switch (update.error) {
      case undefined:
        return { ...update, changesOfOthers: [], written: undefined };
      case "invalid-document":
        return { status: 400, error: update.error };
    }
  }
  const update = updateDocumentWithMerge(editor, { ...change, ...options });
  switch (update.error) {
    case undefined:
      return {
        ...update,
        written: update.changesOfOthers.length > 0 ? update.written : undefined,
      };
    case "invalid-document":
      return { status: 400, error: update.error };
    case "conflict":
      return { status: 409, error: update.error, conflicts: update.conflicts };
  }
}

/** The change of a PUT request: its body as a text in the format, or as BlockNote JSON. */
function readChange(
  format: Format,
  body: string,
): TextChange | JSONChange | ClientError {
  if (format.type === "text") {
    return { format: format.format, text: body };
  }
  const document = parseDocument(body);
  return "error" in document ? document : { document: document.blocks };
}

/**
 * Reads the `Base-Version` and `On-Conflict` headers. Without `Base-Version`,
 * the write applies to the current document, and `On-Conflict` is an error.
 * With `Base-Version`, the default of `On-Conflict` is `reject`.
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
  const onConflict = onConflictHeader ?? "reject";
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
