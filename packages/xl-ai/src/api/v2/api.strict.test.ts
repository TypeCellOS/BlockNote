import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  type BlockOperation,
  type ChangeOfOthers,
  computeOperations,
  getDocumentText,
  htmlFormat,
  type LensBlock,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
  updateDocument,
} from "./index.js";
import { createEditor, replaceOnce } from "./testUtil/fixtures.js";
import { createRandom, randomEdits } from "./testUtil/random.js";
import {
  randomRichDocument,
  randomTextEdit,
  richSchema,
} from "./testUtil/richRandom.js";
import { valid } from "./testUtil/valid.js";
import { flattenBlocks } from "./util/blocks/flatten.js";

/**
 * The strict write: a write with a version as `base` applies only if the
 * document is still at that version. See `api.concurrent.test.ts` for the
 * merge write.
 */

const format = markdownFormat;

const threeParagraphs = [
  { id: "a", type: "paragraph" as const, content: "Alpha" },
  { id: "b", type: "paragraph" as const, content: "Beta" },
  { id: "c", type: "paragraph" as const, content: "Gamma" },
];

/** A client reads the text and the JSON, and keeps the document as the base of a later write. */
function read(editor: BlockNoteEditor<any, any, any>) {
  const base: LensBlock[] = editor.document;
  return { text: getDocumentText(editor, format), base };
}

/** A copy of the document, which a client can change. */
function copy(document: readonly LensBlock[]): LensBlock[] {
  return structuredClone([...document]);
}

/**
 * The operations, with the placeholder "(new)" for each ID that is not an ID
 * of `document`. New IDs are random.
 */
function withNewIdPlaceholders(
  operations: readonly BlockOperation[],
  document: readonly LensBlock[],
): unknown {
  const known = new Set(flattenBlocks(document).map(({ block }) => block.id));
  return JSON.parse(JSON.stringify(operations), (key, value: unknown) =>
    (key === "id" || key === "reference") &&
    typeof value === "string" &&
    !known.has(value)
      ? "(new)"
      : value,
  );
}

/** Each kind of change of another writer, with the item that names it in the error. */
const changesOfOtherWriters: {
  name: string;
  change: (editor: BlockNoteEditor<any, any, any>) => void;
  changesOfOthers: ChangeOfOthers[];
}[] = [
  {
    name: "changed the text of a block",
    change: (editor) => editor.updateBlock("b", { content: "Beta, changed" }),
    changesOfOthers: [{ id: "b", change: "changed" }],
  },
  {
    // Markdown does not show the text color: the text of the document is
    // the text that the client read.
    name: "changed only a prop that the format does not show",
    change: (editor) =>
      editor.updateBlock("b", { props: { textColor: "red" } }),
    changesOfOthers: [{ id: "b", change: "changed" }],
  },
  {
    name: "moved a block",
    change: (editor) => {
      const [, , c] = editor.document;
      editor.removeBlocks(["c"]);
      editor.insertBlocks([c], "a", "before");
    },
    changesOfOthers: [{ id: "c", change: "moved" }],
  },
  {
    name: "added a block",
    change: (editor) =>
      editor.insertBlocks(
        [{ id: "x", type: "paragraph", content: "New" }],
        "b",
        "after",
      ),
    changesOfOthers: [{ id: "x", change: "added" }],
  },
  {
    name: "removed a block",
    change: (editor) => editor.removeBlocks(["c"]),
    changesOfOthers: [{ id: "c", change: "removed" }],
  },
];

describe("a strict write of a text from a version", () => {
  it.each(changesOfOtherWriters)(
    "gives the error document-changed, with the block, if another writer $name",
    ({ change, changesOfOthers }) => {
      const editor = createEditor(threeParagraphs);
      const client = read(editor);
      change(editor);
      const before = editor.document;

      const result = updateDocument(editor, {
        format,
        text: replaceOnce(client.text, "Alpha", "Alpha, from the client"),
        base: client.base,
      });

      expect(result).toEqual({ error: "document-changed", changesOfOthers });
      expect(editor.document).toEqual(before);
    },
  );

  it("gives the error also if the client did not change the text", () => {
    const editor = createEditor(threeParagraphs);
    const client = read(editor);
    editor.updateBlock("b", { content: "Beta, changed" });

    expect(computeOperations(editor, { format, ...client })).toEqual({
      error: "document-changed",
      changesOfOthers: [{ id: "b", change: "changed" }],
    });
  });

  it("names each block that other writers changed", () => {
    const editor = createEditor(threeParagraphs);
    const client = read(editor);
    editor.updateBlock("b", { content: "Beta, changed" });
    editor.insertBlocks(
      [{ id: "x", type: "paragraph", content: "New" }],
      "b",
      "after",
    );
    editor.removeBlocks(["c"]);

    const result = computeOperations(editor, { format, ...client });

    expect(result).toEqual({
      error: "document-changed",
      changesOfOthers: expect.arrayContaining([
        { id: "b", change: "changed" },
        { id: "x", change: "added" },
        { id: "c", change: "removed" },
      ]),
    });
    expect(result).toHaveProperty("changesOfOthers.length", 3);
  });

  it("gives the operations of a write to the current document, if no other writer changed the document", () => {
    const editor = createEditor();
    const client = read(editor);
    // The client changes a block, adds a block and removes a block.
    const text = replaceOnce(
      replaceOnce(
        client.text,
        "Colored centered paragraph",
        "Colored paragraph\n\nA new line",
      ),
      "\n\nLast paragraph",
      "",
    );

    const strict = valid(
      computeOperations(editor, { format, text, base: client.base }),
    );
    const current = valid(
      computeOperations(editor, { format, text, base: "current" }),
    );

    expect(strict.operations.map((operation) => operation.type)).toEqual(
      expect.arrayContaining(["update", "insert", "delete"]),
    );
    expect(withNewIdPlaceholders(strict.operations, client.base)).toEqual(
      withNewIdPlaceholders(current.operations, client.base),
    );
    expect(strict.warnings).toEqual(current.warnings);
  });

  it("applies a write from a version that a store kept as JSON", () => {
    const editor = createEditor(threeParagraphs);
    const client = read(editor);
    const stored: LensBlock[] = JSON.parse(JSON.stringify(client.base));
    const text = replaceOnce(client.text, "Gamma", "Gamma, changed");

    const strict = valid(
      computeOperations(editor, { format, text, base: stored }),
    );

    expect(strict.operations).toEqual(
      valid(computeOperations(editor, { format, text, base: "current" }))
        .operations,
    );
    expect(strict.operations).toMatchObject([{ type: "update", id: "c" }]);
  });

  // A table without column widths has `columnWidths: [undefined, undefined]`.
  // `JSON.stringify` writes these items as `null`. The compare of the lens
  // takes the two as the same value (see `deepEqual`), as core does.
  it("applies a write from a version that a store kept as JSON, for a document with a table", () => {
    const editor = createEditor([
      {
        id: "t",
        type: "table",
        content: { type: "tableContent", rows: [{ cells: ["A", "B"] }] },
      },
      { id: "p", type: "paragraph", content: "Alpha" },
    ]);
    const client = read(editor);
    const stored: LensBlock[] = JSON.parse(JSON.stringify(client.base));
    expect(JSON.stringify(stored)).toContain('"columnWidths":[null,null]');

    const result = valid(
      computeOperations(editor, {
        format,
        text: replaceOnce(client.text, "Alpha", "Alpha one"),
        base: stored,
      }),
    );

    expect(result.operations).toMatchObject([{ type: "update", id: "p" }]);
  });

  it("applies the write, and the next write from the document after it applies too", () => {
    const editor = createEditor(threeParagraphs);
    const first = read(editor);
    valid(
      updateDocument(editor, {
        format,
        text: replaceOnce(first.text, "Alpha", "Alpha one"),
        base: first.base,
      }),
    );
    // The document after a strict write is the document that the client
    // wrote: it is the base of the next write of the client.
    const second = read(editor);
    valid(
      updateDocument(editor, {
        format,
        text: replaceOnce(second.text, "Alpha one", "Alpha two"),
        base: second.base,
      }),
    );

    expect(getDocumentText(editor, format)).toBe(
      "Alpha two\n\nBeta\n\nGamma\n",
    );
  });

  it("has no changesOfOthers and no written in its result", () => {
    const editor = createEditor(threeParagraphs);
    const client = read(editor);

    expect(
      updateDocument(editor, {
        format,
        text: replaceOnce(client.text, "Alpha", "Alpha one"),
        base: client.base,
      }),
    ).toEqual({
      operations: [expect.objectContaining({ type: "update", id: "a" })],
      warnings: [],
    });
  });
});

describe("a strict write of JSON from a version", () => {
  /** The document of the client: the document that it read, with a red block `a`. */
  function redAlpha(base: readonly LensBlock[]): LensBlock[] {
    const [a, ...others] = copy(base);
    return [{ ...a, props: { ...a.props, textColor: "red" } }, ...others];
  }

  it.each(changesOfOtherWriters)(
    "gives the error document-changed, with the block, if another writer $name",
    ({ change, changesOfOthers }) => {
      const editor = createEditor(threeParagraphs);
      const { base } = read(editor);
      change(editor);
      const before = editor.document;

      const result = updateDocument(editor, {
        document: redAlpha(base),
        base,
      });

      expect(result).toEqual({ error: "document-changed", changesOfOthers });
      expect(editor.document).toEqual(before);
    },
  );

  it("gives the operations of a write to the current document, if no other writer changed the document", () => {
    const editor = createEditor(threeParagraphs);
    const { base } = read(editor);
    const [a, , c] = redAlpha(base);
    // The client changes a block, adds a block and removes a block.
    const document = [a, { type: "paragraph" as const, content: "New" }, c];

    const strict = valid(computeOperations(editor, { document, base }));
    const current = valid(
      computeOperations(editor, { document, base: "current" }),
    );

    expect(strict.operations.map((operation) => operation.type)).toEqual(
      expect.arrayContaining(["update", "insert", "delete"]),
    );
    expect(withNewIdPlaceholders(strict.operations, base)).toEqual(
      withNewIdPlaceholders(current.operations, base),
    );
  });

  it("examines base before the JSON: a JSON that does not fit the schema also gives document-changed", () => {
    const editor = createEditor(threeParagraphs);
    const { base } = read(editor);
    editor.updateBlock("b", { content: "Beta, changed" });

    expect(
      computeOperations(editor, { document: [{ type: "unknown" }], base }),
    ).toEqual({
      error: "document-changed",
      changesOfOthers: [{ id: "b", change: "changed" }],
    });
    // Without a change of another writer, the JSON gives its own error.
    expect(
      computeOperations(editor, {
        document: [{ type: "unknown" }],
        base: editor.document,
      }),
    ).toEqual({ error: "invalid-document" });
  });
});

/**
 * A false reject comes from the form of `base`: a document that is equal to
 * the current document for a reader, but not for the check. With `base` from
 * `editor.document` and no other writer, a write never gives the error
 * `"document-changed"`, and its operations are the operations of a write to
 * the current document. This is also true for a `base` that a store kept as
 * JSON. The documents have all kinds of blocks (see `randomRichDocument`).
 */
describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "HTML", format: htmlFormat },
  { name: "plain text", format: plainTextFormat },
] satisfies { name: string; format: TextFormat }[])(
  "a strict write without other writers, on random documents ($name)",
  ({ name, format }) => {
    it.each(Array.from({ length: 100 }, (_, i) => i + 1))(
      "never gives the error document-changed for seed %i",
      (seed) => {
        const random = createRandom(seed * 7919 + name.length);
        const editor = BlockNoteEditor.create({
          schema: richSchema,
          initialContent: randomRichDocument(random),
        });

        // Two writes: the base of the second one is the document after the
        // first one.
        for (let write = 0; write < 2; write++) {
          const base: LensBlock[] = editor.document;
          const text = randomEdits(
            random,
            getDocumentText(editor, format),
            randomTextEdit,
          );
          const current = computeOperations(editor, {
            format,
            text,
            base: "current",
          });
          const stored: LensBlock[] = JSON.parse(JSON.stringify(base));
          for (const version of [base, stored]) {
            const strict = computeOperations(editor, {
              format,
              text,
              base: version,
            });
            // A random edit of HTML markup can give HTML that does not fit
            // the schema: then the two writes give `invalid-document`.
            expect(strict.error).toBe(current.error);
            if (strict.error === undefined && current.error === undefined) {
              expect(withNewIdPlaceholders(strict.operations, base)).toEqual(
                withNewIdPlaceholders(current.operations, base),
              );
            }
          }
          updateDocument(editor, { format, text, base });
        }
      },
    );
  },
);
