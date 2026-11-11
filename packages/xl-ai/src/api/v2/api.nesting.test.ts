import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  computeOperations,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  type TextFormat,
  updateDocument,
} from "./index.js";
import type { LensBlock } from "./model.js";
import { flattenBlocks } from "./util/blocks/flatten.js";
import { blockToText } from "./util/blocks/text.js";
import { canonicalText } from "./testUtil/canonical.js";
import { replaceOnce } from "./testUtil/fixtures.js";
import { valid } from "./testUtil/valid.js";

/**
 * The nesting that markdown (and HTML) can show: list items, and the
 * blocks in them. Markdown shows all the children of a list item, by
 * indentation. It does not show the children of a paragraph, a heading, a
 * quote or a code block: the exporter writes them after the block, at the
 * same level. The lens keeps such a hidden nesting (see `decideParents` in
 * `target/hiddenNesting.ts`).
 *
 * Each block of the test documents has its text as its ID. A shape gives the
 * IDs of the document, with the children in brackets. A new block shows as
 * "+" and its text.
 */

type Block = PartialBlock<any, any, any>;

function block(type: string, text: string, children: Block[] = []): Block {
  return { id: text, type, content: text, children };
}
const p = (text: string, children?: Block[]) =>
  block("paragraph", text, children);
const h = (text: string, children?: Block[]) =>
  block("heading", text, children);
const q = (text: string, children?: Block[]) => block("quote", text, children);
const code = (text: string, children?: Block[]) =>
  block("codeBlock", text, children);
const bullet = (text: string, children?: Block[]) =>
  block("bulletListItem", text, children);
const numbered = (text: string, children?: Block[]) =>
  block("numberedListItem", text, children);
const check = (text: string, children?: Block[]) =>
  block("checkListItem", text, children);
const toggle = (text: string, children?: Block[]) =>
  block("toggleListItem", text, children);
const table = (text: string): Block => ({
  id: text,
  type: "table",
  content: {
    type: "tableContent",
    rows: [{ cells: [text, "b"] }, { cells: ["c", "d"] }],
  },
});
const image = (name: string): Block => ({
  id: name,
  type: "image",
  props: { url: `https://example.com/${name}.png` },
});

/** The IDs of the blocks, with the children in brackets. A block with an ID that `known` does not have shows as "+" and its text. */
function shapeOf(
  blocks: readonly LensBlock[],
  known: ReadonlySet<string>,
): string {
  return blocks
    .map((b) => {
      const own = known.has(b.id) ? b.id : `+${blockToText(b)}`;
      return b.children.length > 0
        ? `${own}[${shapeOf(b.children, known)}]`
        : own;
    })
    .join(" ");
}

/** The types and the texts of the blocks, with the children in brackets. */
function typesOf(blocks: readonly LensBlock[]): string {
  return blocks
    .map((b) => {
      const url = typeof b.props.url === "string" ? b.props.url : "";
      const own = `${b.type.replace("ListItem", "")}:${blockToText(b) || url}`;
      return b.children.length > 0 ? `${own}[${typesOf(b.children)}]` : own;
    })
    .join(" ");
}

function idsOf(blocks: readonly LensBlock[]): Set<string> {
  return new Set(flattenBlocks(blocks).map(({ block: b }) => b.id));
}

/**
 * Writes the text of a document, changed by `edit`, back to the document.
 * Examines PutGet and PutTwice. Returns the shape of the result and the
 * warnings.
 */
function write(
  document: Block[],
  edit: (text: string) => string,
  format: TextFormat = markdownFormat,
) {
  const editor = BlockNoteEditor.create({ initialContent: document });
  const known = idsOf(editor.document as LensBlock[]);
  const text = edit(getDocumentText(editor, format));
  const update = valid(
    updateDocument(editor, { base: "current", format, text }),
  );
  // PutGet, modulo the normalization of the format.
  expect(canonicalText(editor, format, getDocumentText(editor, format))).toBe(
    canonicalText(editor, format, text),
  );
  // PutTwice.
  expect(
    valid(computeOperations(editor, { base: "current", format, text }))
      .operations,
  ).toEqual([]);
  return {
    shape: shapeOf(editor.document as LensBlock[], known),
    warnings: update.warnings,
    editor,
  };
}

describe("core: the markdown round trip of the nesting", () => {
  const editor = BlockNoteEditor.create();
  function roundTrip(document: Block[]): string {
    return typesOf(
      editor.tryParseMarkdownToBlocks(
        editor.blocksToMarkdownLossy(document as never),
      ) as LensBlock[],
    );
  }

  it.each<[string, Block[], string]>([
    [
      "a bullet in a bullet",
      [bullet("A", [bullet("B")])],
      "bullet:A[bullet:B]",
    ],
    [
      "a paragraph and a bullet in a bullet",
      [bullet("A", [p("B"), bullet("C")])],
      "bullet:A[paragraph:B bullet:C]",
    ],
    [
      "a bullet and a paragraph in a bullet",
      [bullet("A", [bullet("C"), p("B")])],
      "bullet:A[bullet:C paragraph:B]",
    ],
    [
      "a code block, a quote, a table, an image and a heading in a bullet",
      [bullet("A", [code("x = 1"), q("Q"), table("T"), image("I"), h("H")])],
      "bullet:A[codeBlock:x = 1 quote:Q table:T b\nc d image:https://example.com/I.png heading:H]",
    ],
    [
      "a paragraph in a numbered item",
      [numbered("A", [p("B")])],
      "numbered:A[paragraph:B]",
    ],
    [
      "a bullet in a check item, and a check item in a bullet",
      [check("A", [bullet("B")]), bullet("C", [check("D")])],
      "check:A[bullet:B] bullet:C[check:D]",
    ],
    [
      "five levels of mixed list items",
      [numbered("A", [bullet("B", [check("C", [numbered("D", [p("E")])])])])],
      "numbered:A[bullet:B[check:C[numbered:D[paragraph:E]]]]",
    ],
  ])("keeps the children of a list item: %s", (_, document, expected) => {
    expect(roundTrip(document)).toBe(expected);
  });

  it.each<[string, Block[], string]>([
    [
      "a toggle becomes a bullet, with its children",
      [toggle("A", [p("B"), bullet("C")])],
      "bullet:A[paragraph:B bullet:C]",
    ],
    [
      "the children of a paragraph go after it",
      [p("A", [p("B"), bullet("C")])],
      "paragraph:A paragraph:B bullet:C",
    ],
    [
      "the children of a heading go after it",
      [h("A", [p("B")])],
      "heading:A paragraph:B",
    ],
    [
      "the children of a quote go after it",
      [q("A", [bullet("B")])],
      "quote:A bullet:B",
    ],
    [
      "the children of a code block go after it",
      [code("A", [p("B")])],
      "codeBlock:A paragraph:B",
    ],
    [
      "the children of a paragraph in a bullet go into the bullet",
      [bullet("A", [p("B", [p("C"), bullet("D")])])],
      "bullet:A[paragraph:B paragraph:C bullet:D]",
    ],
  ])("changes the nesting: %s", (_, document, expected) => {
    expect(roundTrip(document)).toBe(expected);
  });
});

describe("core: the markdown parse of nesting that the exporter does not write", () => {
  const editor = BlockNoteEditor.create();
  function parse(markdown: string): string {
    return typesOf(editor.tryParseMarkdownToBlocks(markdown) as LensBlock[]);
  }

  it.each<[string, string, string]>([
    ["an indent of four spaces", "- a\n    - b\n", "bullet:a[bullet:b]"],
    ["a tab", "- a\n\t- b\n", "bullet:a[bullet:b]"],
    ["a loose list", "* a\n\n  * b\n\n* c\n", "bullet:a[bullet:b] bullet:c"],
    // CommonMark: "- b" is not in the item, because its indent is less
    // than the content of the item (3). It starts a new list.
    [
      "a list with less indent than the content of a numbered item",
      "1. a\n  - b\n",
      "numbered:a[bullet:b]",
    ],
    // CommonMark agrees: "b" is not in the item.
    [
      "a paragraph with less indent than the content of a numbered item",
      "1. a\n\n  b\n",
      "numbered:a paragraph:b",
    ],
    ["a quote in a list item", "* a\n  > q\n", "bullet:a[quote:q]"],
    // A quote is one block with inline content: its paragraphs join with
    // hard breaks.
    ["a quote with two paragraphs", "> a\n>\n> b\n", "quote:a\nb"],
    ["a quote in a quote", "> a\n>\n> > b\n", "quote:a\nb"],
  ])("%s", (_, markdown, expected) => {
    expect(parse(markdown)).toBe(expected);
  });

  // The numbered list item takes the start from the `start` attribute of
  // its list. If the item has a nested list, `createGroups` of
  // `nestedLists.ts` wraps the item in a `div`. The parse rule of the
  // numbered list item reads the attribute of the list, not of that `div`
  // (`NumberedListItem/block.ts`).
  it("keeps the start of a numbered list whose first item has a nested list", () => {
    const blocks = editor.tryParseMarkdownToBlocks("3. A\n   * c\n4. B\n");
    expect(blocks[0].props).toMatchObject({ start: 3 });
  });

  // The tokenizer of a quote joins all its lines, and the HTML parse of the
  // quote takes only the text. A quote has no container form in BlockNote.
  it.fails("KNOWN: keeps the list items of a list in a quote", () => {
    expect(parse("> Q\n>\n> * a\n> * b\n")).toBe("quote:Q[bullet:a bullet:b]");
  });

  // CommonMark: a line without indent after the first line of a list item
  // continues its paragraph (a lazy continuation line). The tokenizer of a
  // list item ends the item at a line with less indent than its content.
  it.fails("KNOWN: keeps a lazy continuation line in its list item", () => {
    expect(parse("* a\nb\n")).toBe("bullet:a\nb");
  });
});

describe("markdown, list items", () => {
  it("indents a list item", () => {
    expect(
      write([bullet("A"), bullet("B"), bullet("C")], (text) =>
        replaceOnce(text, "* B", "  * B"),
      ).shape,
    ).toBe("A[B] C");
  });

  it("outdents a list item, and the next items go into it", () => {
    expect(
      write([bullet("A", [bullet("B"), bullet("C"), bullet("D")])], (text) =>
        replaceOnce(text, "  * C", "* C"),
      ).shape,
    ).toBe("A[B] C[D]");
  });

  it("moves a list item into a list item of a different list", () => {
    expect(
      write(
        [bullet("A", [bullet("B")]), p("x"), bullet("X", [bullet("Y")])],
        (text) =>
          replaceOnce(
            replaceOnce(text, "  * B\n", ""),
            "  * Y",
            "  * Y\n  * B",
          ),
      ).shape,
    ).toBe("A x X[Y B]");
  });

  it("moves a list item up two levels and into a different list item", () => {
    expect(
      write([bullet("A", [bullet("B", [bullet("C")])]), bullet("D")], (text) =>
        replaceOnce(replaceOnce(text, "    * C\n", ""), "* D", "* D\n  * C"),
      ).shape,
    ).toBe("A[B] D[C]");
  });

  it("changes the type of a list item in a list item of a different type", () => {
    const { shape, editor } = write([numbered("A", [bullet("B")])], (text) =>
      replaceOnce(text, "   * B", "   1. B"),
    );
    expect(shape).toBe("A[B]");
    expect(editor.getBlock("B")?.type).toBe("numberedListItem");
  });

  it("checks a check item in a bullet", () => {
    const { editor } = write([bullet("A", [check("B")])], (text) =>
      replaceOnce(text, "[ ] B", "[x] B"),
    );
    expect(editor.getBlock("B")?.props).toMatchObject({ checked: true });
  });

  it.each([
    ["a loose list", "* A\n\n  * B\n\n* C\n"],
    ["dashes and an indent of four spaces", "- A\n    - B\n- C\n"],
    ["plus signs and a tab", "+ A\n\t+ B\n+ C\n"],
  ])("writes %s with the same list items, without operations", (_, text) => {
    const editor = BlockNoteEditor.create({
      initialContent: [bullet("A", [bullet("B")]), bullet("C")],
    });
    expect(
      valid(
        computeOperations(editor, {
          base: "current",
          format: markdownFormat,
          text,
        }),
      ).operations,
    ).toEqual([]);
  });

  it("adds a paragraph to a list item with two paragraphs", () => {
    expect(
      write([bullet("A", [p("B"), p("C")])], (text) =>
        replaceOnce(text, "  C\n", "  C\n\n  D\n"),
      ).shape,
    ).toBe("A[B C +D]");
  });

  it("changes a code block in a list item, and keeps its ID", () => {
    const { shape, editor } = write([bullet("A", [code("x = 1")])], (text) =>
      replaceOnce(text, "x = 1", "x = 2"),
    );
    expect(shape).toBe("A[x = 1]");
    expect(editor.getBlock("x = 1")?.content).toMatchObject([
      { text: "x = 2" },
    ]);
  });

  it("moves a code block and a quote out of a list item", () => {
    expect(
      write([bullet("A", [code("x = 1"), q("Q")]), p("Z")], (text) =>
        replaceOnce(
          replaceOnce(text, "  ```text\n  x = 1\n  ```", "```text\nx = 1\n```"),
          "  > Q",
          "> Q",
        ),
      ).shape,
    ).toBe("A x = 1 Q Z");
  });

  it("indents a list item to the fourth level", () => {
    expect(
      write([bullet("A", [bullet("B", [bullet("C"), bullet("D")])])], (text) =>
        replaceOnce(text, "    * D", "      * D"),
      ).shape,
    ).toBe("A[B[C[D]]]");
  });

  it("puts a new list item between two nested list items", () => {
    expect(
      write([bullet("A", [bullet("B"), bullet("C")])], (text) =>
        replaceOnce(text, "  * C", "  * N\n  * C"),
      ).shape,
    ).toBe("A[B +N C]");
  });

  it("puts a new list item at the end of a nested list", () => {
    expect(
      write([bullet("A", [bullet("B"), bullet("C")]), bullet("D")], (text) =>
        replaceOnce(text, "  * C", "  * C\n  * N"),
      ).shape,
    ).toBe("A[B C +N] D");
  });

  it("puts a new empty list item between two nested list items", () => {
    expect(
      write([bullet("A", [bullet("B"), bullet("C")])], (text) =>
        replaceOnce(text, "  * C", "  *\n  * C"),
      ).shape,
    ).toBe("A[B + C]");
  });

  it("indents an empty list item", () => {
    expect(
      write(
        [bullet("A"), { id: "E", type: "bulletListItem" }, bullet("C")],
        (text) => replaceOnce(text, "* \n", "  *\n"),
      ).shape,
    ).toBe("A[E] C");
  });

  it("keeps the children of a list item that the text removes", () => {
    expect(
      write([bullet("A", [bullet("B"), bullet("C")]), p("Z")], (text) =>
        replaceOnce(text, "* A\n", ""),
      ).shape,
    ).toBe("B C Z");
  });

  it("keeps a toggle, and the hidden child of a paragraph in it, if the text changes the toggle", () => {
    const { shape, editor } = write([toggle("T", [p("B", [p("C")])])], (text) =>
      replaceOnce(text, "* T", "* T2"),
    );
    expect(shape).toBe("T[B[C]]");
    expect(editor.getBlock("T")?.type).toBe("toggleListItem");
  });

  it("changes the start of a numbered list", () => {
    const { editor } = write(
      [{ ...numbered("A"), props: { start: 3 } }, numbered("B")],
      (text) => replaceOnce(text, "3. A", "5. A"),
    );
    expect(editor.getBlock("A")?.props).toMatchObject({ start: 5 });
  });
});

describe("markdown, lists in a nesting that markdown does not show", () => {
  it("keeps a list in a paragraph if the text indents an item of it", () => {
    expect(
      write([p("P", [bullet("N1"), bullet("N2")])], (text) =>
        replaceOnce(text, "* N2", "  * N2"),
      ).shape,
    ).toBe("P[N1[N2]]");
  });

  it("puts a new list item between two items of a list in a paragraph into the paragraph", () => {
    expect(
      write([p("P", [bullet("N1"), bullet("N2")])], (text) =>
        replaceOnce(text, "* N2", "* M\n* N2"),
      ).shape,
    ).toBe("P[N1 +M N2]");
  });

  it("puts a new list item between a heading and its hidden child into the heading", () => {
    expect(
      write([h("H", [p("C"), p("D")])], (text) =>
        replaceOnce(text, "C\n\nD", "C\n\n* N\n\nD"),
      ).shape,
    ).toBe("H[C +N D]");
  });

  it("indents an item of a list after a paragraph with a hidden child, and keeps the hidden child", () => {
    expect(
      write([p("P", [p("C")]), bullet("X"), bullet("Y")], (text) =>
        replaceOnce(text, "* Y", "  * Y"),
      ).shape,
    ).toBe("P[C] X[Y]");
  });

  it("indents a list item with a paragraph with a hidden child, and keeps the hidden child", () => {
    expect(
      write([bullet("A"), bullet("B", [p("C", [p("D")])])], (text) =>
        text
          .replace("* B", "  * B")
          .replace("\n  C", "\n    C")
          .replace("\n  D", "\n    D"),
      ).shape,
    ).toBe("A[B[C[D]]]");
  });

  it("keeps a hidden child if the text checks the check item around it", () => {
    expect(
      write([check("A", [p("B", [p("C")])])], (text) =>
        replaceOnce(text, "[ ]", "[x]"),
      ).shape,
    ).toBe("A[B[C]]");
  });

  it("moves the hidden child of a removed paragraph to the place of the paragraph", () => {
    expect(
      write([p("P", [p("C")]), p("Z")], (text) =>
        replaceOnce(text, "P\n\n", ""),
      ).shape,
    ).toBe("C Z");
  });

  // Before `parentMovedAlong`, the hidden child C kept its parent B only
  // if the text parent of C kept its type (`nestingUnchanged`). The text
  // parent of C is the list item A (markdown shows B and C as children of
  // A). Thus, a change of the type of A moved C out of B, into A. B does not
  // change. Markdown shows the children of a bullet, a numbered item and a
  // check item in the same way.
  it.each<[string, Block[], (text: string) => string]>([
    [
      "a bullet becomes a check item",
      [bullet("A", [p("B", [p("C")])])],
      (text) => replaceOnce(text, "* A", "* [ ] A"),
    ],
    [
      "a bullet becomes a numbered item",
      [bullet("A", [p("B", [p("C")])])],
      (text) => text.replace("* A", "1. A").replace(/\n {2}/g, "\n   "),
    ],
    [
      "a toggle becomes a check item",
      [toggle("A", [p("B", [p("C")])])],
      (text) => replaceOnce(text, "* A", "* [ ] A"),
    ],
  ])(
    "keeps a hidden child in its parent if %s around them",
    (_, document, edit) => {
      expect(write(document, edit).shape).toBe("A[B[C]]");
    },
  );

  // The same rule: before `parentMovedAlong`, if the text changed the
  // parent of the hidden child C, the text decided, also if the hidden
  // parent B moved with C (B and C stay siblings in the text, as in the
  // view).
  it.each<[string, Block[], (text: string) => string, string]>([
    [
      "the text removes the list item around them",
      [bullet("L", [p("B", [p("C")])]), p("Z")],
      (text) => replaceOnce(text, "* L\n\n  B\n\n  C\n", "B\n\nC\n"),
      "B[C] Z",
    ],
    [
      "the text outdents them out of a list item",
      [bullet("L", [p("B", [p("C")])]), p("Z")],
      (text) => replaceOnce(text, "  B\n\n  C\n", "B\n\nC\n"),
      "L B[C] Z",
    ],
    [
      "the text indents them into a list item",
      [bullet("L"), p("B", [p("C")]), p("Z")],
      (text) => replaceOnce(text, "B\n\nC\n", "  B\n\n  C\n"),
      "L[B[C]] Z",
    ],
    [
      "the text moves them into a different list item",
      [bullet("L", [p("B", [p("C")])]), bullet("M")],
      (text) =>
        replaceOnce(
          replaceOnce(text, "\n  B\n\n  C\n", ""),
          "* M",
          "* M\n\n  B\n\n  C",
        ),
      "L M[B[C]]",
    ],
  ])(
    "keeps a hidden child in its parent if %s",
    (_, document, edit, expected) => {
      expect(write(document, edit).shape).toBe(expected);
    },
  );
});

describe("markdown, writes from an older version that change the nesting", () => {
  /** Another writer writes `theirs`, then the client writes `ours` from the version before. */
  function writeTwo(
    document: Block[],
    theirs: (text: string) => string,
    ours: (text: string) => string,
  ) {
    const editor = BlockNoteEditor.create({ initialContent: document });
    const known = idsOf(editor.document as LensBlock[]);
    const base = editor.document;
    const text = getDocumentText(editor, markdownFormat);
    valid(
      updateDocument(editor, {
        base: "current",
        format: markdownFormat,
        text: theirs(text),
      }),
    );
    const update = valid(
      updateDocument(editor, {
        base,
        format: markdownFormat,
        text: ours(text),
      }),
    );
    // No revert.
    expect(
      valid(computeOperations(editor, { base, format: markdownFormat, text }))
        .operations,
    ).toEqual([]);
    return {
      shape: shapeOf(editor.document as LensBlock[], known),
      warnings: update.warnings,
      editor,
    };
  }

  it("keeps the outdent of another writer and the change of the client", () => {
    const { shape, editor } = writeTwo(
      [bullet("A", [bullet("B"), bullet("C")])],
      (text) => replaceOnce(text, "  * C", "* C"),
      (text) => replaceOnce(text, "  * C", "  * C2"),
    );
    expect(shape).toBe("A[B] C");
    expect(editor.getBlock("C")?.content).toMatchObject([{ text: "C2" }]);
  });

  it("keeps the indents of two writers of two blocks", () => {
    expect(
      writeTwo(
        [bullet("A"), bullet("B"), bullet("C")],
        (text) => replaceOnce(text, "* B", "  * B"),
        (text) => replaceOnce(text, "* C", "  * C"),
      ).shape,
    ).toBe("A[B[C]]");
  });

  it("keeps the parent of another writer, with a warning, if the client indents the block into a different parent", () => {
    const { shape, warnings } = writeTwo(
      [bullet("A"), bullet("X"), bullet("B")],
      (text) =>
        replaceOnce(replaceOnce(text, "* B\n", ""), "* A\n", "* A\n  * B\n"),
      (text) => replaceOnce(text, "* B", "  * B"),
    );
    expect(shape).toBe("A[B] X");
    expect(warnings).toEqual([{ type: "conflicting-change", id: "B" }]);
  });

  it("keeps a list item with a new child of another writer, with a warning, if the client removes it", () => {
    const { shape, warnings } = writeTwo(
      [bullet("A"), bullet("B"), bullet("C")],
      (text) => replaceOnce(text, "* B", "* B\n  * new"),
      (text) => replaceOnce(text, "* B\n", ""),
    );
    expect(shape).toBe("A B[+new] C");
    expect(warnings).toEqual([{ type: "removed-changed-block", id: "B" }]);
  });

  it("moves a new child of the client to the place of its parent, if another writer removed the parent", () => {
    expect(
      writeTwo(
        [bullet("A", [bullet("B")]), p("Z")],
        (text) => replaceOnce(text, "* A\n  * B\n", ""),
        (text) => replaceOnce(text, "  * B", "  * B\n  * N"),
      ).shape,
    ).toBe("+N Z");
  });
});

describe("markdown, list items that the text shows as one list share the parent of that list", () => {
  // The parent of a list can be a nesting that markdown does not show (for
  // example a paragraph with a list in it). See `listParent` in
  // `target/hiddenNesting.ts`.

  // A swap: the alignment marks one of the two items as moved (rule 2).
  // Before the list rule, a moved block kept its hidden nesting only near a
  // hidden ancestor that the format does not render (for example a column),
  // and the moved item went to the parent of the text.
  it.each<[string, Block[], (text: string) => string, string]>([
    [
      "a list in a paragraph",
      [p("P", [bullet("N1"), bullet("N2")]), p("Z")],
      (text) => replaceOnce(text, "* N1\n* N2", "* N2\n* N1"),
      "P[N2 N1] Z",
    ],
    [
      "a list in a quote",
      [q("Q", [bullet("a"), bullet("b")])],
      (text) => replaceOnce(text, "* a\n* b", "* b\n* a"),
      "Q[b a]",
    ],
    [
      "a list in a paragraph in a list item",
      [bullet("A", [p("B", [bullet("c"), bullet("d")])])],
      (text) => replaceOnce(text, "  * c\n  * d", "  * d\n  * c"),
      "A[B[d c]]",
    ],
  ])(
    "keeps the hidden nesting if the text swaps the last two items of %s",
    (_, document, edit, expected) => {
      expect(write(document, edit).shape).toBe(expected);
    },
  );

  // A moved block without hidden ancestors stays in its source parent if
  // that parent is open (`isNearHiddenAncestor`). This is also true for
  // blocks that are not list items.
  it("keeps the hidden nesting if the text swaps the last two paragraphs in a paragraph", () => {
    expect(
      write([p("P", [p("C1"), p("C2")]), p("Z")], (text) =>
        replaceOnce(text, "C1\n\nC2", "C2\n\nC1"),
      ).shape,
    ).toBe("P[C2 C1] Z");
  });

  // An outdent: the item stays in the list of the item before it, thus it
  // goes into the parent of that list. Before the list rule, it went into
  // the parent of the text. It closed the hidden parent, and the next items,
  // which the text does not change, left that parent too.
  it.each<[string, Block[], (text: string) => string, string]>([
    [
      "a list in a paragraph",
      [p("P", [bullet("A", [bullet("L")]), bullet("B")])],
      (text) => replaceOnce(text, "  * L", "* L"),
      "P[A L B]",
    ],
    [
      "a list in a heading",
      [h("H", [bullet("a", [bullet("b")]), bullet("c")])],
      (text) => replaceOnce(text, "  * b", "* b"),
      "H[a b c]",
    ],
  ])(
    "keeps the next items of %s if the text outdents an item out of an earlier item",
    (_, document, edit, expected) => {
      expect(write(document, edit).shape).toBe(expected);
    },
  );

  // A new item after an item of a list goes into the parent of that list.
  // Before the list rule, a new block went into the nesting of the next
  // kept block (`nestingOfNext`). At the end of a list in a paragraph, the
  // next kept block is not in the paragraph, thus the new item went to the
  // parent of the text, apart from its list.
  it.each<[string, Block[], (text: string) => string, string]>([
    [
      "a bullet list in a paragraph",
      [p("P", [bullet("N1"), bullet("N2")]), p("Z")],
      (text) => replaceOnce(text, "* N2", "* N2\n* N3"),
      "P[N1 N2 +N3] Z",
    ],
    [
      "a numbered list in a paragraph",
      [p("P", [numbered("N1"), numbered("N2")]), p("Z")],
      (text) => replaceOnce(text, "2. N2", "2. N2\n3. N3"),
      "P[N1 N2 +N3] Z",
    ],
    [
      "a list in a heading, at the end of the document",
      [h("H", [bullet("a"), bullet("b")])],
      (text) => replaceOnce(text, "* b", "* b\n* c"),
      "H[a b +c]",
    ],
    [
      "a bullet list in a paragraph, with a check item",
      [p("P", [bullet("N1"), bullet("N2")]), p("Z")],
      (text) => replaceOnce(text, "* N2", "* N2\n* [ ] N3"),
      "P[N1 N2 +N3] Z",
    ],
  ])(
    "puts a new item at the end of %s into the same list",
    (_, document, edit, expected) => {
      expect(write(document, edit).shape).toBe(expected);
    },
  );

  it.each<[string, Block[], (text: string) => string, string]>([
    [
      "a numbered item after a bullet list in a paragraph",
      [p("P", [bullet("N1"), bullet("N2")]), p("Z")],
      (text) => replaceOnce(text, "* N2", "* N2\n\n1. N3"),
      "P[N1 N2] +N3 Z",
    ],
    [
      "a paragraph after a list in a paragraph",
      [p("P", [bullet("N1"), bullet("N2")]), p("Z")],
      (text) => replaceOnce(text, "* N2", "* N2\n\nN3"),
      "P[N1 N2] +N3 Z",
    ],
  ])(
    "keeps the other rules for %s: the text does not show it in the list",
    (_, document, edit, expected) => {
      expect(write(document, edit).shape).toBe(expected);
    },
  );
});

describe("KNOWN problems: the hidden nesting in lists (markdown)", () => {
  // The list rule applies only to list items of one list. A block that the
  // text does not show in the list of the item before it (here a code
  // block) keeps the other rules: it goes into the parent of the text. It
  // closes the hidden parent P, and the next item B, which the text does
  // not change, cannot go back into P.
  it.fails("KNOWN: keeps the next items of a list in a paragraph if the text outdents a code block out of an earlier item", () => {
    expect(
      write([p("P", [bullet("A", [code("x = 1")]), bullet("B")])], (text) =>
        replaceOnce(text, "  ```text\n  x = 1\n  ```", "```text\nx = 1\n```"),
      ).shape,
    ).toBe("P[A x = 1 B]");
  });
});

describe("markdown, the start of a numbered list with a nested list", () => {
  // Before the fix of core, the parse lost the start of a numbered list
  // whose first item has a nested list (see "core: the markdown parse"
  // above). The view of the document had the start, and the text block did
  // not. Thus, the merge took the change of the text: the start went.
  it("keeps the start of a numbered list if the text adds a nested list to its first item", () => {
    const { editor } = write(
      [{ ...numbered("A"), props: { start: 3 } }, numbered("B")],
      (text) => replaceOnce(text, "3. A", "3. A\n   * c"),
    );
    expect(editor.getBlock("A")?.props).toMatchObject({ start: 3 });
  });

  // Before the fix of core, the view and the text both lost the start.
  // Thus, the merge saw no change of the start, and the document kept 3.
  it("changes the start of a numbered list whose first item has a nested list", () => {
    const { editor } = write(
      [{ ...numbered("A", [bullet("c")]), props: { start: 3 } }, numbered("B")],
      (text) => replaceOnce(text, "3. A", "5. A"),
    );
    expect(editor.getBlock("A")?.props).toMatchObject({ start: 5 });
  });
});

describe("HTML, list items", () => {
  it("indents a list item into a nested list", () => {
    expect(
      write(
        [bullet("A"), bullet("B")],
        (text) =>
          text
            .replace(/<\/li><li>/, "<ul><li>")
            .replace("</li></ul>", "</li></ul></li></ul>"),
        htmlFormat,
      ).shape,
    ).toBe("A[B]");
  });

  it("keeps a toggle and its children if the text changes the toggle", () => {
    expect(
      write(
        [toggle("T", [bullet("a"), p("b")])],
        (text) => replaceOnce(text, ">T<", ">T2<"),
        htmlFormat,
      ).shape,
    ).toBe("T[a b]");
  });

  // HTML does not show the children of a paragraph either. The list rule
  // is the same as in markdown.
  it("keeps the hidden nesting if the text swaps the last two items of a list in a paragraph", () => {
    expect(
      write(
        [p("P", [bullet("N1"), bullet("N2")]), p("Z")],
        (text) =>
          text.replace(/(<li[^>]*>.*?<\/li>)(<li[^>]*>.*?<\/li>)/, "$2$1"),
        htmlFormat,
      ).shape,
    ).toBe("P[N2 N1] Z");
  });

  it("puts a new item at the end of a list in a paragraph into the same list", () => {
    expect(
      write(
        [p("P", [bullet("N1"), bullet("N2")]), p("Z")],
        (text) => replaceOnce(text, "</ul>", "<li><p>N3</p></li></ul>"),
        htmlFormat,
      ).shape,
    ).toBe("P[N1 N2 +N3] Z");
  });
});
