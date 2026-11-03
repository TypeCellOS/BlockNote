import type { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import {
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
  type TextUpdate,
  updateDocumentFromJSON,
  updateDocumentFromText,
  type ValidTextUpdate,
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
 * The version of the document that a response shows. With its next write, a
 * client sends the version of the text that it has in `Base-Version`.
 */
const VERSION_HEADER = "Document-Version";
/** The version of the document that the client read before it changed the text. */
const BASE_HEADER = "Base-Version";

/** An error of the client, as a value: the HTTP status and a code. */
type ClientError = { status: 400 | 404 | 409; error: string };

/**
 * An HTTP API for documents, with the text lens:
 *
 * - `GET /documents/:id/:format` gives the document as `json`, `markdown`,
 *   `html` or `text`, with its version in the `Document-Version` header.
 * - `PUT /documents/:id/:format` writes a changed document back. The write
 *   applies only the changes, and keeps the data that the format does not
 *   show. Send the version that the client read in the `Base-Version`
 *   header. Then the write keeps the changes that other writers made after
 *   that version. The response gives the document after the write (with
 *   the changes of other writers) and its version, for the next write.
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
    c.header(VERSION_HEADER, String(version));
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
    // the document between this write and its commit.
    const id = c.req.param("id");
    const { editor } = store.current(id);
    const base = readBase(c.req.header(BASE_HEADER), store, id);
    if (base !== undefined && "error" in base) {
      return c.json({ error: base.error }, base.status);
    }
    const result = write(editor, format, body, base?.blocks);
    if (result.error !== undefined) {
      return c.json({ error: result.error }, result.status);
    }
    const version =
      result.operations.length > 0
        ? store.commit(id)
        : store.current(id).version;
    c.header(VERSION_HEADER, String(version));
    return c.json({ version, ...read(editor, format), ...result });
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

/** Applies the body of a PUT request to the document. */
function write(
  editor: BlockNoteEditor<any, any, any>,
  format: Format,
  body: string,
  base: Block<any, any, any>[] | undefined,
): ValidTextUpdate | ClientError {
  if (format.type === "text") {
    return orClientError(
      updateDocumentFromText(editor, {
        format: format.format,
        text: body,
        base,
      }),
    );
  }
  const document = parseDocument(body);
  if ("error" in document) {
    return document;
  }
  return orClientError(
    updateDocumentFromJSON(editor, { document: document.blocks, base }),
  );
}

/** The update, or the status 400 if the text or the JSON does not fit the schema. */
function orClientError(update: TextUpdate): ValidTextUpdate | ClientError {
  return update.error === undefined
    ? update
    : { status: 400, error: update.error };
}

/** Reads the `Base-Version` header. Without the header, there is no base. */
function readBase(
  header: string | undefined,
  store: DocumentStore,
  id: string,
): { blocks: Block<any, any, any>[] } | ClientError | undefined {
  if (header === undefined) {
    return undefined;
  }
  const blocks = /^\d+$/.test(header)
    ? store.version(id, Number(header))
    : undefined;
  return blocks === undefined
    ? { status: 409, error: "unknown-base-version" }
    : { blocks };
}

/**
 * Parses a JSON body: an array of blocks. This checks only the shape of the
 * tree, for the types. `updateDocumentFromJSON` checks the blocks against
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
      if (children !== undefined) {
        lists.push({ list: children, depth: depth + 1 });
      }
    }
  }
  return true;
}
