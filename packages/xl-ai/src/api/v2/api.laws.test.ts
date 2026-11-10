import type { Block } from "@blocknote/core";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  applyOperations,
  computeTextUpdate,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "./index.js";
import {
  blockFieldsById,
  createEditor,
  createSharedDocumentEditor,
  diffBlocks,
  documentShape,
} from "./testUtil/fixtures.js";
import { canonicalText } from "./testUtil/canonical.js";
import { type Codec, formatCases } from "./testUtil/codecs.js";
import { valid } from "./testUtil/valid.js";

/**
 * The lens laws (see the README). The tests examine them on two documents, in
 * each format:
 *
 * - GetPut: if a client writes back the text that it read, nothing changes.
 * - PutGet: if the document did not change after the client read the text, a
 *   read after a write gives the written text. The format can normalize the
 *   text: two texts are equal if they render the same after a round trip.
 * - PutTwice: if a client writes the same text two times, the second write
 *   changes nothing.
 * - Retention: blocks that an edit does not touch keep their ID, type, props,
 *   content and nesting.
 */

const documents = [
  { name: "shared test document", create: createSharedDocumentEditor },
  { name: "rich document", create: () => createEditor() },
];

type Edit = {
  name: string;
  apply: (parts: string[], codec: Codec) => string[];
  /** The number of blocks with changed fields that the edit can touch. */
  retention: "all-kept" | "one-changed" | "survivors-unchanged" | "none";
};

const edits: Edit[] = [
  {
    name: "insert a paragraph at the start",
    apply: (parts, codec) => [codec.paragraph("Inserted paragraph"), ...parts],
    retention: "all-kept",
  },
  {
    name: "insert a paragraph in the middle",
    apply: (parts, codec) => {
      const middle = Math.floor(parts.length / 2);
      return [
        ...parts.slice(0, middle),
        codec.paragraph("Inserted paragraph"),
        ...parts.slice(middle),
      ];
    },
    retention: "all-kept",
  },
  {
    name: "insert a paragraph at the end",
    apply: (parts, codec) => [...parts, codec.paragraph("Inserted paragraph")],
    retention: "all-kept",
  },
  {
    name: "change a paragraph",
    apply: (parts, codec) => {
      const index = parts.findIndex(codec.isPlain);
      return parts.map((part, i) =>
        i === index ? codec.append(part, " (edited)") : part,
      );
    },
    retention: "one-changed",
  },
  {
    name: "remove a paragraph",
    apply: (parts, codec) => {
      const index = parts.findIndex(codec.isPlain);
      return parts.filter((_, i) => i !== index);
    },
    retention: "survivors-unchanged",
  },
  {
    name: "swap two paragraphs",
    apply: (parts, codec) => {
      const index = parts.findIndex(
        (part, i) => codec.isPlain(part) && codec.isPlain(parts[i + 1] ?? ""),
      );
      const result = [...parts];
      [result[index], result[index + 1]] = [result[index + 1], result[index]];
      return result;
    },
    retention: "none",
  },
];

describe.each(documents)("$name", ({ create }) => {
  describe.each(formatCases)("$name", ({ format, codec }) => {
    it("GetPut: a write of the text that the client read changes nothing", () => {
      const editor = create();
      const text = getDocumentText(editor, format);

      expect(
        valid(computeTextUpdate(editor, { base: "current", format, text })),
      ).toEqual({
        operations: [],
        warnings: [],
      });
      // This text is not equal to the text that the client read. Thus, it goes
      // through the full pipeline.
      expect(
        valid(
          computeTextUpdate(editor, {
            base: "current",
            format,
            text: `\n${text}\n\n`,
          }),
        ),
      ).toEqual({ operations: [], warnings: [] });
    });

    it.each(edits)(
      "$name: PutGet, PutTwice and retention",
      ({ apply, retention }) => {
        const editor = create();
        const before = blockFieldsById(editor);
        const shape = documentShape(editor.document);
        const text = codec.join(
          apply(codec.split(getDocumentText(editor, format)), codec),
        );
        const update = valid(
          updateDocumentFromText(editor, { base: "current", format, text }),
        );

        // PutGet: a read gives the written text.
        expect(update.warnings).toEqual([]);
        expect(
          canonicalText(editor, format, getDocumentText(editor, format)),
        ).toBe(canonicalText(editor, format, text));

        // PutTwice: a second write of the same text changes nothing.
        expect(
          valid(computeTextUpdate(editor, { base: "current", format, text }))
            .operations,
        ).toEqual([]);

        // Retention: the blocks that the edit does not touch stay, with
        // their fields and their nesting.
        const { changed, removed } = diffBlocks(
          before,
          blockFieldsById(editor),
        );
        const keptShape = shapeOf(editor.document, new Set(before.keys()));
        switch (retention) {
          case "all-kept":
            expect({ changed, removed }).toEqual({ changed: [], removed: [] });
            expect(keptShape).toEqual(shape);
            break;
          case "one-changed":
            expect(removed).toEqual([]);
            expect(changed).toHaveLength(1);
            expect(keptShape).toEqual(shape);
            break;
          case "survivors-unchanged":
            expect(changed).toEqual([]);
            break;
          case "none":
            break;
        }
      },
    );
  });
});

/**
 * The shape of the document (see `documentShape`) with only the blocks in
 * `ids`. The children of another block (a new block) take its place.
 */
function shapeOf(
  blocks: Block<any, any, any>[],
  ids: ReadonlySet<string>,
): unknown[] {
  return blocks.flatMap((block) => {
    const children = shapeOf(block.children, ids);
    if (!ids.has(block.id)) {
      return children;
    }
    return children.length > 0 ? [block.id, children] : [block.id];
  });
}

describe("markdown normalization", () => {
  it("bullets with `-` instead of `*` change nothing", () => {
    const editor = createSharedDocumentEditor();
    const text = getDocumentText(editor, markdownFormat).replace(
      /^(\s*)\* /gm,
      "$1- ",
    );
    expect(
      valid(
        computeTextUpdate(editor, {
          base: "current",
          format: markdownFormat,
          text,
        }),
      ).operations,
    ).toEqual([]);
  });
});

/**
 * A mounted editor has the plugins for a user who types, for example the
 * autolink plugin, which changes a URL into a link. A write of a text does
 * not come from a user who types. Thus, the laws must be true also in a
 * mounted editor.
 */
describe("a mounted editor", () => {
  const mounted: ReturnType<typeof createEditor>[] = [];
  afterEach(() => {
    for (const editor of mounted.splice(0)) {
      editor.unmount();
    }
  });
  function createMountedEditor() {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "Alpha end" },
    ]);
    editor.mount(document.createElement("div"));
    mounted.push(editor);
    return editor;
  }

  it("keeps a URL of a plain text as text", () => {
    const editor = createMountedEditor();
    const text = "Alpha https://example.com end";

    valid(
      updateDocumentFromText(editor, {
        base: "current",
        format: plainTextFormat,
        text,
      }),
    );

    expect(editor.getBlock("p")?.content).toEqual([
      { type: "text", text, styles: {} },
    ]);
  });

  it("gives back the markdown text of an escaped URL", () => {
    const editor = createMountedEditor();
    const text = "Alpha https\\://example.com end\n";

    valid(
      updateDocumentFromText(editor, {
        base: "current",
        format: markdownFormat,
        text,
      }),
    );

    expect(getDocumentText(editor, markdownFormat)).toBe(text);
  });
});

describe("a byte order mark", () => {
  it.each([
    { name: "markdown", format: markdownFormat },
    { name: "plain text", format: plainTextFormat },
    { name: "HTML", format: htmlFormat },
  ])("at the start of the text changes nothing ($name)", ({ format }) => {
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const text = `\uFEFF${getDocumentText(editor, format)}`;

    expect(
      valid(computeTextUpdate(editor, { base: "current", format, text }))
        .operations,
    ).toEqual([]);
  });
});

describe("line ends", () => {
  it("reads markdown with \\r\\n line ends as the same text", () => {
    const editor = createSharedDocumentEditor();
    const text = getDocumentText(editor, markdownFormat).replace(/\n/g, "\r\n");

    expect(
      valid(
        computeTextUpdate(editor, {
          base: "current",
          format: markdownFormat,
          text,
        }),
      ).operations,
    ).toEqual([]);
  });
});

describe("a document with two blocks with one ID", () => {
  it("changes only the block whose text changed", () => {
    const editor = createEditor([
      {
        id: "x",
        type: "paragraph",
        props: { textColor: "red" },
        content: "Alpha",
      },
      { id: "x", type: "paragraph", content: "Beta" },
    ]);
    const text = getDocumentText(editor, markdownFormat);

    const update = valid(
      updateDocumentFromText(editor, {
        base: "current",
        format: markdownFormat,
        text: text.replace("Beta", "Beta two"),
      }),
    );

    expect(update.warnings).toEqual([]);
    expect(editor.document.map((block) => block.props)).toMatchObject([
      { textColor: "red" },
      { textColor: "default" },
    ]);
    expect(editor.document[1].content).toMatchObject([{ text: "Beta two" }]);
  });

  it("computes the operations of the write, and applyOperations applies them", () => {
    // Two editors with the same document: one computes and applies, one
    // writes.
    const documentWithOneId = [
      { id: "x", type: "paragraph" as const, content: "Alpha" },
      { id: "x", type: "paragraph" as const, content: "Beta" },
    ];
    const computing = createEditor(documentWithOneId);
    const writing = createEditor(documentWithOneId);
    const text = getDocumentText(computing, markdownFormat).replace(
      "Beta",
      "Beta two",
    );
    const options = { base: "current" as const, format: markdownFormat, text };

    const update = valid(computeTextUpdate(computing, options));
    computing.transact((tr) => applyOperations(tr, update.operations));
    valid(updateDocumentFromText(writing, options));

    // The later block counts as `x-2` in the operations, and gets that ID.
    expect(update.operations).toMatchObject([{ type: "update", id: "x-2" }]);
    expect(computing.document).toEqual(writing.document);
  });
});

describe("a document after `removeBlocks` removed all blocks", () => {
  it("gives the block without an ID an ID, and writes the text", () => {
    // In an editor without a view, the block that fills the empty document
    // has no ID.
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "Alpha" },
    ]);
    editor.removeBlocks(editor.document);

    valid(
      updateDocumentFromText(editor, {
        base: "current",
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
        computeTextUpdate(editor, {
          base: "current",
          format: markdownFormat,
          text: "Hello\n",
        }),
      ).operations,
    ).toEqual([]);
  });
});

/**
 * A text can give a block that the format does not show: the round trip of
 * that block alone gives nothing. A broken HTML tag can give such a block.
 * The write does not keep it. Else, the view does not show it after the
 * write, and each later write of the same text adds it again (PutTwice).
 */
describe("a block of the text that the format does not show", () => {
  it.each([
    // Markdown: an image without a URL exports as nothing.
    { name: "markdown", format: markdownFormat, text: "Alpha\n\n<img>\n" },
    // HTML: a paragraph with only white space exports as `<p> </p>`, and
    // the parse drops that paragraph.
    {
      name: "HTML",
      format: htmlFormat,
      text: '<p>Alpha</p><p data-background-color="blue">\uFFFC\n\n</p>',
    },
  ])("is not in the document after the write ($name)", ({ format, text }) => {
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "Alpha" },
    ]);
    valid(updateDocumentFromText(editor, { base: "current", format, text }));

    expect(editor.document.map((block) => block.id)).toEqual(["a"]);
    // PutTwice.
    expect(
      valid(computeTextUpdate(editor, { base: "current", format, text }))
        .operations,
    ).toEqual([]);
    // PutGet.
    expect(canonicalText(editor, format, getDocumentText(editor, format))).toBe(
      canonicalText(editor, format, text),
    );
  });
});

describe("plain text: white space at the end of a block", () => {
  it("keeps the laws if the client removes the block after a block that ends with a hard break", () => {
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "Alpha\n " },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const text = "Alpha";
    valid(
      updateDocumentFromText(editor, {
        base: "current",
        format: plainTextFormat,
        text,
      }),
    );

    expect(
      canonicalText(
        editor,
        plainTextFormat,
        getDocumentText(editor, plainTextFormat),
      ),
    ).toBe(canonicalText(editor, plainTextFormat, text));
    expect(
      valid(
        computeTextUpdate(editor, {
          base: "current",
          format: plainTextFormat,
          text,
        }),
      ).operations,
    ).toEqual([]);
  });
});
