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
} from "@blocknote/xl-ai/text-lens";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import type { DocumentStore } from "./documents.js";

/** The text formats, by the name in the URL. */
const textFormats: Record<string, { format: TextFormat; contentType: string }> =
  {
    markdown: {
      format: markdownFormat,
      contentType: "text/markdown; charset=utf-8",
    },
    html: { format: htmlFormat, contentType: "text/html; charset=utf-8" },
    text: { format: plainTextFormat, contentType: "text/plain; charset=utf-8" },
  };

/**
 * The version of the document that a response shows, or that a write
 * creates. A client sends it back in `Base-Version` with its next write.
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
 *   that version.
 */
export function createApp(store: DocumentStore) {
  const app = new Hono();
  app.use("/documents/*", bodyLimit({ maxSize: 5 * 1024 * 1024 }));

  app.get("/documents/:id/:format", (c) => {
    const { editor, version } = store.current(c.req.param("id"));
    c.header(VERSION_HEADER, String(version));
    const format = c.req.param("format");
    if (format === "json") {
      return c.json(editor.document);
    }
    const text = textFormats[format];
    if (text === undefined) {
      return c.json({ error: "unknown-format" }, 404);
    }
    return c.body(getDocumentText(editor, text.format), 200, {
      "Content-Type": text.contentType,
    });
  });

  app.put("/documents/:id/:format", async (c) => {
    const id = c.req.param("id");
    const { editor } = store.current(id);
    const result = await write(c, editor, store, id);
    if ("error" in result) {
      return c.json({ error: result.error }, result.status);
    }
    const version =
      result.operations.length > 0
        ? store.commit(id)
        : store.current(id).version;
    c.header(VERSION_HEADER, String(version));
    return c.json({ version, ...result });
  });

  return app;
}

/** Applies the body of a PUT request to the document. */
async function write(
  c: Context,
  editor: BlockNoteEditor<any, any, any>,
  store: DocumentStore,
  id: string,
): Promise<TextUpdate | ClientError> {
  const base = readBase(c.req.header(BASE_HEADER), store, id);
  if (base !== undefined && "error" in base) {
    return base;
  }

  const format = c.req.param("format");
  if (format === "json") {
    const document = parseDocument(await c.req.text(), editor);
    if ("error" in document) {
      return document;
    }
    return updateDocumentFromJSON(editor, {
      document: document.blocks,
      base: base?.blocks,
    });
  }
  const text = textFormats[format];
  if (text === undefined) {
    return { status: 404, error: "unknown-format" };
  }
  return updateDocumentFromText(editor, {
    format: text.format,
    text: await c.req.text(),
    base: base?.blocks,
  });
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

/** Parses a JSON body: an array of blocks with known block types. */
function parseDocument(
  body: string,
  editor: BlockNoteEditor<any, any, any>,
): { blocks: PartialBlock<any, any, any>[] } | ClientError {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { status: 400, error: "invalid-json" };
  }
  if (!Array.isArray(json) || !json.every((block) => isBlock(block, editor))) {
    return { status: 400, error: "invalid-document" };
  }
  return { blocks: json };
}

function isBlock(
  value: unknown,
  editor: BlockNoteEditor<any, any, any>,
): value is PartialBlock<any, any, any> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { type, children } = value as { type?: unknown; children?: unknown };
  return (
    typeof type === "string" &&
    type in editor.schema.blockSchema &&
    (children === undefined ||
      (Array.isArray(children) &&
        children.every((child) => isBlock(child, editor))))
  );
}
