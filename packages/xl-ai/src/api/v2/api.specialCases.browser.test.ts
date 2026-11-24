import { describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";

import {
  applyOperations,
  computeOperations,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  updateDocument,
} from "./index.js";
import { canonicalText } from "./testUtil/canonical.js";
import { valid } from "./testUtil/valid.js";

/*
 * Writes to special editors and documents, and writes of special texts: a
 * mounted editor, a byte order mark, two blocks with one ID, a document after
 * `removeBlocks`, and markup that the serializer does not write.
 */

/**
 * A mounted editor has the plugins for a user who types, for example the
 * autolink plugin, which changes a URL into a link. A write of a text does
 * not come from a user who types. Thus, the laws must be true also in a
 * mounted editor.
 */
describe("a mounted editor", () => {
  async function createMountedEditor(setupEditor: SetupEditor) {
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent: [{ id: "p", type: "paragraph", content: "Alpha end" }],
    });
    return editor;
  }

  it("keeps a URL of a plain text as text", async ({ setupEditor }) => {
    const editor = await createMountedEditor(setupEditor);
    const text = "Alpha https://example.com end";

    valid(
      updateDocument(editor, {
        format: plainTextFormat,
        text,
      }),
    );

    expect(editor.getBlock("p")?.content).toEqual([
      { type: "text", text, styles: {} },
    ]);
  });

  it("gives back the markdown text of an escaped URL", async ({
    setupEditor,
  }) => {
    const editor = await createMountedEditor(setupEditor);
    const text = "Alpha https\\://example.com end\n";

    valid(
      updateDocument(editor, {
        format: markdownFormat,
        text,
      }),
    );

    expect(getDocumentText(editor, markdownFormat)).toBe(text);
  });
});

describe("a byte order mark", () => {
  it.for([
    { name: "markdown", format: markdownFormat },
    { name: "plain text", format: plainTextFormat },
    { name: "HTML", format: htmlFormat },
  ])(
    "at the start of the text changes nothing ($name)",
    async ({ format }, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: false,
        initialContent: [
          { id: "a", type: "paragraph", content: "Alpha" },
          { id: "b", type: "paragraph", content: "Beta" },
        ],
      });
      const text = `\uFEFF${getDocumentText(editor, format)}`;

      expect(
        valid(computeOperations(editor, { format, text })).operations,
      ).toEqual([]);
    },
  );

  it("keeps a byte order mark that the document has (plain text)", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: [{ id: "a", type: "paragraph", content: "\uFEFFHello" }],
    });
    const text = getDocumentText(editor, plainTextFormat);
    const update = valid(
      computeOperations(editor, {
        format: plainTextFormat,
        text,
      }),
    );
    expect(update.operations).toEqual([]);
  });
});

// REVISIT: two blocks with one ID (for example in a Y.Doc, after two
// writers moved the same block: a move is a removal and an insert) are a broken
// invariant for the lens: it pairs blocks by ID. Thus, a write throws, and
// the document does not change. An earlier version gave the later block the
// ID with a number (`x-2`) on each side, and kept these laws. We can return
// to that, or fix the IDs in the Y.Doc, if such documents occur (see
// `assertBlockIds`).
describe("a document with two blocks with one ID", () => {
  const documentWithOneId = [
    { id: "x", type: "paragraph" as const, content: "Alpha" },
    { id: "x", type: "paragraph" as const, content: "Beta" },
  ];

  it("throws for a text write, and the document does not change", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: documentWithOneId,
    });
    const before = editor.document;
    const text = getDocumentText(editor, markdownFormat);

    expect(() =>
      updateDocument(editor, {
        format: markdownFormat,
        text: text.replace("Beta", "Beta two"),
      }),
    ).toThrow("Two blocks of the current document have the ID x");
    expect(editor.document).toEqual(before);
  });

  it("throws for computeOperations", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: documentWithOneId,
    });
    expect(() =>
      computeOperations(editor, {
        format: markdownFormat,
        text: getDocumentText(editor, markdownFormat),
      }),
    ).toThrow("Two blocks of the current document have the ID x");
  });

  it("throws for a JSON write, also of the unchanged JSON", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: documentWithOneId,
    });
    expect(() =>
      computeOperations(editor, {
        document: JSON.parse(JSON.stringify(editor.document)),
      }),
    ).toThrow("Two blocks of the current document have the ID x");
  });

  it("throws for applyOperations with an update", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: documentWithOneId,
    });
    expect(() =>
      editor.transact((tr) =>
        applyOperations(tr, [
          { type: "update", id: "x", update: { type: "heading" } },
        ]),
      ),
    ).toThrow("Block x is already in the document");
  });

  it("throws for applyOperations with operations that change the structure", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: documentWithOneId,
    });
    expect(() =>
      editor.transact((tr) =>
        applyOperations(tr, [{ type: "move", id: "x", placement: "start" }]),
      ),
    ).toThrow("Block x is already in the document");
  });
});

describe("a document after `removeBlocks` removed all blocks", () => {
  it("writes the text", async ({ setupEditor }) => {
    // The editor gives the block that fills the empty document an ID, also
    // without a view (a core fix). Before, that block had no ID.
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: [{ id: "a", type: "paragraph", content: "Alpha" }],
    });
    editor.removeBlocks(editor.document);

    valid(
      updateDocument(editor, {
        format: markdownFormat,
        text: "Hello\n",
      }),
    );

    expect(editor.document).toMatchObject([
      { type: "paragraph", content: [{ text: "Hello" }] },
    ]);
    // A second write of the same text changes nothing (PutTwice).
    expect(
      valid(
        computeOperations(editor, {
          format: markdownFormat,
          text: "Hello\n",
        }),
      ).operations,
    ).toEqual([]);
  });
});

/**
 * A text with markup that the serializer does not write. The parse gives only
 * blocks that the format shows (rules of core, and `assertBlocksRoundTrip`), thus
 * the laws hold.
 */
describe("a text with markup that the serializer does not write", () => {
  it.for([
    // Markdown: an HTML tag without a source gives no block.
    {
      name: "markdown",
      format: markdownFormat,
      text: "Alpha\n\n<img>\n",
      blocks: 1,
    },
    // HTML: a paragraph with only white space is a block that HTML shows.
    {
      name: "HTML",
      format: htmlFormat,
      text: '<p>Alpha</p><p data-background-color="blue">\uFFFC\n\n</p>',
      blocks: 2,
    },
  ])(
    "keeps PutTwice and PutGet ($name)",
    async ({ format, text, blocks }, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: false,
        initialContent: [{ id: "a", type: "paragraph", content: "Alpha" }],
      });
      valid(updateDocument(editor, { format, text }));

      expect(editor.document).toHaveLength(blocks);
      // PutTwice.
      expect(
        valid(computeOperations(editor, { format, text })).operations,
      ).toEqual([]);
      // PutGet.
      expect(
        canonicalText(editor, format, getDocumentText(editor, format)),
      ).toBe(canonicalText(editor, format, text));
    },
  );
});
