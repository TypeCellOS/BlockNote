import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { describe, expect, it } from "vite-plus/test";

import {
  computeTextUpdate,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "./index.js";
import { flattenBlocks } from "./blocks/flatten.js";
import type { LensBlock } from "./blocks/types.js";
import {
  blockFieldsById,
  createEditor,
  diffBlocks,
  documentShape,
  replaceOnce,
} from "./testUtil/fixtures.js";
import {
  createRandom,
  type Random,
  randomDocument,
  randomEdit,
} from "./testUtil/random.js";
import { valid } from "./testUtil/valid.js";

/**
 * Writes of a text from an older version (`base`) to a document without Yjs.
 * Another writer changed the document after the client read the text. See
 * `yjs/yDocText.test.ts` for the same cases on a Y.Doc.
 */

const format = markdownFormat;

/** A client reads the text, and keeps the document as the base of a later write. */
function read(editor: BlockNoteEditor<any, any, any>) {
  return { text: getDocumentText(editor, format), base: editor.document };
}

function write(
  editor: BlockNoteEditor<any, any, any>,
  client: ReturnType<typeof read>,
  edit: (text: string) => string,
) {
  return valid(
    updateDocumentFromText(editor, {
      format,
      text: edit(client.text),
      base: client.base,
    }),
  );
}

const fruit: PartialBlock[] = [
  {
    id: "fruit",
    type: "bulletListItem",
    content: "Fruit",
    children: [
      { id: "apples", type: "bulletListItem", content: "Apples" },
      { id: "pears", type: "bulletListItem", content: "Pears" },
    ],
  },
  { id: "end", type: "paragraph", content: "End" },
];

describe("a write from an older version", () => {
  it("changes nothing if the client did not change the text", () => {
    const editor = createEditor();
    const client = read(editor);
    write(editor, read(editor), (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
    );

    expect(
      valid(computeTextUpdate(editor, { format, ...client })).operations,
    ).toEqual([]);
  });

  it("keeps the changes of another writer in a different block", () => {
    const editor = createEditor();
    const client = read(editor);
    write(editor, read(editor), (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph from B"),
    );
    write(editor, client, (text) =>
      replaceOnce(text, "Colored centered paragraph", "Colored by A"),
    );

    expect(editor.getBlock("colored")?.content).toMatchObject([
      { text: "Colored by A" },
    ]);
    expect(editor.getBlock("last")?.content).toMatchObject([
      { text: "Last paragraph from B" },
    ]);
  });

  it("keeps a change to a block that another user dragged", () => {
    const editor = createEditor();
    const client = read(editor);
    const last = editor.getBlock("last");
    if (last === undefined) {
      throw new Error("Block not found");
    }
    editor.removeBlocks(["last"]);
    editor.insertBlocks([last], "colored", "before");

    write(editor, client, (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
    );

    expect(editor.document[0]).toMatchObject({
      id: "last",
      content: [{ text: "Last paragraph, edited" }],
    });
    expect(documentShape(editor.document)).toHaveLength(
      documentShape(client.base).length,
    );
  });

  it("moves a block that another writer changed, and keeps the change", () => {
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
      { id: "c", type: "paragraph", content: "Gamma" },
    ]);
    const client = read(editor);
    write(editor, read(editor), (text) =>
      replaceOnce(text, "Gamma", "Gamma, edited"),
    );
    write(editor, client, (text) =>
      replaceOnce(text, "Alpha\n\nBeta\n\nGamma", "Gamma\n\nAlpha\n\nBeta"),
    );

    expect(editor.document.map((block) => block.id)).toEqual(["c", "a", "b"]);
    expect(editor.getBlock("c")?.content).toMatchObject([
      { text: "Gamma, edited" },
    ]);
  });

  it("keeps the text of two writers who add text at the same position", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "Intro." },
    ]);
    const client = read(editor);
    write(editor, read(editor), (text) =>
      replaceOnce(text, "Intro.", "Intro. Added by A."),
    );
    write(editor, client, (text) =>
      replaceOnce(text, "Intro.", "Intro. Added by B."),
    );

    expect(editor.getBlock("p")?.content).toMatchObject([
      { text: "Intro. Added by A. Added by B." },
    ]);
  });

  it("keeps a block that another writer moved into a block that the text removes", () => {
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "bulletListItem", content: "Beta" },
      { id: "c", type: "bulletListItem", content: "Gamma" },
    ]);
    const client = read(editor);
    write(editor, read(editor), (text) =>
      replaceOnce(text, "* Gamma", "  * Gamma"),
    );
    write(editor, client, (text) => replaceOnce(text, "* Beta\n", ""));

    expect(documentShape(editor.document)).toEqual(["a", "c"]);
  });

  it("keeps the blocks that the text keeps, if the text removes their parent and another writer removed a sibling", () => {
    const editor = createEditor([
      {
        id: "parent",
        type: "bulletListItem",
        content: "Parent",
        children: [
          { id: "one", type: "bulletListItem", content: "One" },
          { id: "two", type: "bulletListItem", content: "Two" },
        ],
      },
      { id: "end", type: "paragraph", content: "End" },
    ]);
    const client = read(editor);
    write(editor, read(editor), (text) => replaceOnce(text, "  * One\n", ""));
    write(editor, client, () => "* One\n* New\n* Two\n\nEnd\n");

    expect(
      editor.document.map(
        (block) => (block.content as { text: string }[])[0]?.text,
      ),
    ).toEqual(["New", "Two", "End"]);
  });

  it("applies a write that a client sends two times one time", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "Intro." },
    ]);
    const client = read(editor);
    write(editor, client, (text) =>
      replaceOnce(text, "Intro.", "Intro. Added."),
    );
    write(editor, client, (text) =>
      replaceOnce(text, "Intro.", "Intro. Added."),
    );

    expect(editor.getBlock("p")?.content).toMatchObject([
      { text: "Intro. Added." },
    ]);
  });

  it("applies the same fix of two writers one time", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "helo" },
    ]);
    const client = read(editor);
    write(editor, read(editor), (text) => replaceOnce(text, "helo", "hello"));
    write(editor, client, (text) => replaceOnce(text, "helo", "hello"));

    expect(editor.getBlock("p")?.content).toMatchObject([{ text: "hello" }]);
  });

  it("does one move if two writers make the same move", () => {
    const editor = createEditor(fruit);
    const client = read(editor);
    write(editor, read(editor), (text) =>
      replaceOnce(text, "  * Pears", "* Pears"),
    );
    write(editor, client, (text) => replaceOnce(text, "  * Pears", "* Pears"));

    expect(documentShape(editor.document)).toEqual([
      "fruit",
      ["apples"],
      "pears",
      "end",
    ]);
  });

  it("keeps a change to a block that another writer moved", () => {
    const editor = createEditor(fruit);
    const client = read(editor);
    write(editor, read(editor), (text) =>
      replaceOnce(text, "  * Pears", "* Pears"),
    );
    write(editor, client, (text) =>
      replaceOnce(text, "Pears", "Pears and plums"),
    );

    expect(documentShape(editor.document)).toEqual([
      "fruit",
      ["apples"],
      "pears",
      "end",
    ]);
    expect(editor.getBlock("pears")?.content).toMatchObject([
      { text: "Pears and plums" },
    ]);
  });
});

/**
 * Random pairs of writers. Writer A and writer B read the same version and
 * edit it. A writes first. Then B writes, with the version that it read as
 * the base. Each case has a seed.
 *
 * The result must contain the changes of each writer to the blocks that only
 * that writer changed. A change is the result of the write of that writer
 * alone.
 */
describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
  { name: "HTML", format: htmlFormat },
])("random pairs of writers ($name)", ({ format }) => {
  it.each(Array.from({ length: 40 }, (_, i) => i + 1))(
    "keeps the changes of the two writers for seed %i",
    (seed) => {
      const random = createRandom(seed);
      const editor = BlockNoteEditor.create({
        initialContent: randomDocument(random),
      });
      const base = editor.document;
      const text = getDocumentText(editor, format);
      const textA = randomEdit(random, text);
      const textB = randomEdit(random, text);

      /** Returns the changes of one writer alone, by block ID. */
      function alone(edited: string) {
        const single = BlockNoteEditor.create({ initialContent: base });
        const before = blockFieldsById(single);
        valid(updateDocumentFromText(single, { format, text: edited }));
        const after = blockFieldsById(single);
        return { after, ...diffBlocks(before, after) };
      }
      const a = alone(textA);
      const b = alone(textB);

      valid(updateDocumentFromText(editor, { format, text: textA }));
      valid(updateDocumentFromText(editor, { format, text: textB, base }));
      const result = blockFieldsById(editor);

      const ids = flattenBlocks(editor.document as LensBlock[]).map(
        ({ block }) => block.id,
      );
      expect(new Set(ids).size).toBe(ids.length);

      const touched = (side: typeof a, id: string) =>
        side.changed.includes(id) || side.removed.includes(id);
      for (const [side, other] of [
        [a, b],
        [b, a],
      ] as const) {
        for (const id of side.changed.filter((id) => !touched(other, id))) {
          expect(result.get(id), `block ${id}`).toEqual(side.after.get(id));
        }
        for (const id of side.removed.filter((id) => !touched(other, id))) {
          expect(result.has(id), `block ${id}`).toBe(false);
        }
      }
    },
  );
});

/**
 * Random groups of three or four writers. Each writer reads a version, edits
 * its text, and writes it later, with the version that it read as the base.
 * The reads and the writes come in a random order. Thus, a writer can read a
 * version that contains the writes of some other writers. Each case has a
 * seed.
 *
 * The result must contain the change of each writer to each block that no
 * other writer changed or removed. A change is the result of the write of
 * that writer alone, on the version that it read. After the last write, a
 * write of the text of the result must change nothing.
 */
describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
  { name: "HTML", format: htmlFormat },
])("random groups of writers ($name)", ({ format }) => {
  it.each(Array.from({ length: 40 }, (_, i) => i + 1))(
    "keeps the changes of each writer for seed %i",
    (seed) => {
      const random = createRandom(seed);
      const editor = BlockNoteEditor.create({
        initialContent: randomDocument(random),
      });

      type Writer = {
        base: LensBlock[];
        text: string;
        change: ReturnType<typeof diffBlocks> & {
          after: ReturnType<typeof blockFieldsById>;
        };
      };
      const writers: Writer[] = [];
      for (const { writer, step } of randomSchedule(
        random,
        3 + random.int(2),
      )) {
        if (step === "read") {
          const base: LensBlock[] = editor.document;
          const text = randomEdit(random, getDocumentText(editor, format));
          writers[writer] = { base, text, change: alone(base, text) };
        } else {
          const { base, text } = writers[writer];
          valid(updateDocumentFromText(editor, { format, text, base }));
        }
      }
      const result = blockFieldsById(editor);

      const ids = flattenBlocks(editor.document as LensBlock[]).map(
        ({ block }) => block.id,
      );
      expect(new Set(ids).size).toBe(ids.length);

      writers.forEach(({ change }, writer) => {
        const others = writers.filter((_, other) => other !== writer);
        const untouched = (id: string) =>
          others.every(
            ({ change }) =>
              !change.changed.includes(id) && !change.removed.includes(id),
          );
        for (const id of change.changed.filter(untouched)) {
          expect(result.get(id), `block ${id}`).toEqual(change.after.get(id));
        }
        for (const id of change.removed.filter(untouched)) {
          expect(result.has(id), `block ${id}`).toBe(false);
        }
      });

      const text = getDocumentText(editor, format);
      expect(
        valid(computeTextUpdate(editor, { format, text })).operations,
      ).toEqual([]);

      /** Returns the changes of one writer alone, by block ID. */
      function alone(base: LensBlock[], text: string): Writer["change"] {
        const single = BlockNoteEditor.create({ initialContent: base });
        const before = blockFieldsById(single);
        valid(updateDocumentFromText(single, { format, text }));
        const after = blockFieldsById(single);
        return { after, ...diffBlocks(before, after) };
      }
    },
  );
});

/**
 * A random order of the reads and the writes of `count` writers. The read of
 * each writer comes before its write.
 */
function randomSchedule(random: Random, count: number) {
  const done = Array.from({ length: count }, () => 0);
  const schedule: { writer: number; step: "read" | "write" }[] = [];
  for (let left = 2 * count; left > 0; left--) {
    const writer = random.pick(
      done.flatMap((steps, writer) => (steps < 2 ? [writer] : [])),
    );
    schedule.push({ writer, step: done[writer] === 0 ? "read" : "write" });
    done[writer]++;
  }
  return schedule;
}

describe("a write from an older version, with blocks that the client moves", () => {
  it("indents a block under the position that the client wants, if another writer removed the block before it", () => {
    const editor = createEditor([
      { id: "a", type: "bulletListItem", content: "Apples" },
      { id: "b", type: "bulletListItem", content: "Bananas" },
      { id: "c", type: "bulletListItem", content: "Cherries" },
      { id: "end", type: "paragraph", content: "End" },
    ]);
    const client = read(editor);
    editor.removeBlocks(["b"]);

    write(editor, client, (text) =>
      replaceOnce(
        replaceOnce(text, "* Bananas", "  * Bananas"),
        "* Cherries",
        "  * Cherries",
      ),
    );

    expect(documentShape(editor.document)).toEqual(["a", ["c"], "end"]);
  });
});

describe("a write from an older version, with blocks that another writer moved", () => {
  it("moves a block after a new block that the rebase put into the moved block", () => {
    const editor = createEditor([
      { id: "x", type: "paragraph", content: "Xtext" },
      { id: "p", type: "paragraph", content: "Ptext" },
      { id: "q", type: "paragraph", content: "Qtext" },
    ]);
    const client = read(editor);
    // Another writer nests Q in X.
    editor.removeBlocks(["q"]);
    editor.updateBlock("x", {
      children: [{ id: "q", type: "paragraph", content: "Qtext" }],
    });

    write(editor, client, () => "Ptext\n\nQtext\n\nNew\n\nXtext\n");

    expect(getDocumentText(editor, format)).toContain("New");
    expect(editor.getBlock("x")).toBeDefined();
    expect(editor.getBlock("p")).toBeDefined();
  });
});

describe("a write from an older version with a conflict", () => {
  it("gives a warning if the client and another writer change the same word", () => {
    const editor = createEditor(fruit);
    const client = read(editor);
    editor.updateBlock("end", { content: "The finish" });

    const update = write(editor, client, (text) =>
      replaceOnce(text, "End", "Stop"),
    );

    expect(update.warnings).toEqual([
      { type: "conflicting-change", id: "end" },
    ]);
    expect(editor.getBlock("end")?.content).toMatchObject([{ text: "Stop" }]);
  });

  it("gives a warning if another writer changed the block into a type that cannot hold the text of the client", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "Alpha beta gamma" },
    ]);
    const client = read(editor);
    editor.updateBlock("p", {
      type: "image",
      props: { url: "https://example.com/a.png" },
    });

    const update = write(editor, client, (text) =>
      replaceOnce(text, "gamma", "delta"),
    );

    expect(update.warnings).toEqual([{ type: "conflicting-change", id: "p" }]);
    expect(editor.getBlock("p")).toMatchObject({
      type: "paragraph",
      content: [{ text: "Alpha beta delta" }],
    });
  });

  it("keeps a style that the client adds to the last word, if another writer adds text after it", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "Read the manual" },
    ]);
    const client = read(editor);
    editor.updateBlock("p", {
      content: "Read the manual today, and then the guide.",
    });

    write(editor, client, (text) => replaceOnce(text, "manual", "**manual**"));

    expect(editor.getBlock("p")?.content).toEqual([
      { type: "text", text: "Read the ", styles: {} },
      { type: "text", text: "manual", styles: { bold: true } },
      { type: "text", text: " today, and then the guide.", styles: {} },
    ]);
  });

  it("gives no warning for changes to different parts of one block", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "One two three four" },
    ]);
    const client = read(editor);
    editor.updateBlock("p", { content: "One two three four five" });

    const update = write(editor, client, (text) =>
      replaceOnce(text, "One", "Zero"),
    );

    expect(update.warnings).toEqual([]);
    expect(editor.getBlock("p")?.content).toMatchObject([
      { text: "Zero two three four five" },
    ]);
  });

  it("gives a warning if another writer split the block that the client changes", () => {
    const editor = createEditor([
      {
        id: "a",
        type: "paragraph",
        content: "First half of the text. Second half of the text.",
      },
    ]);
    const client = read(editor);
    // Another writer splits the block.
    editor.updateBlock("a", { content: "First half of the text." });
    editor.insertBlocks(
      [{ id: "a2", type: "paragraph", content: "Second half of the text." }],
      "a",
      "after",
    );

    const update = write(editor, client, (text) =>
      replaceOnce(text, "Second half of the", "Second half of the changed"),
    );

    expect(update.warnings).toEqual([{ type: "conflicting-change", id: "a" }]);
  });
});

describe("a write from an older version that removes blocks", () => {
  it("removes a child that another writer moved out of a block that the client removes", () => {
    const editor = createEditor(fruit);
    const client = read(editor);
    // Another writer outdents Apples.
    editor.removeBlocks(["apples"]);
    editor.insertBlocks(
      [{ id: "apples", type: "bulletListItem", content: "Apples" }],
      "fruit",
      "after",
    );

    // The client removes Fruit and its children.
    write(editor, client, () => "End\n");

    expect(editor.document.map((block) => block.id)).toEqual(["end"]);
  });
});

describe("a write from an older version, with columns", () => {
  function createColumnsEditor(
    columns: PartialBlock<any, any, any>[],
  ): BlockNoteEditor<any, any, any> {
    return BlockNoteEditor.create({
      schema: withMultiColumn(
        BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
      ),
      initialContent: [
        { id: "list", type: "columnList", children: columns },
        { id: "end", type: "paragraph", content: "End" },
      ],
    });
  }
  function column(
    id: string,
    blockId: string,
    text: string,
  ): PartialBlock<any, any, any> {
    return {
      id,
      type: "column",
      children: [{ id: blockId, type: "paragraph", content: text }],
    };
  }
  function columnsShape(editor: BlockNoteEditor<any, any, any>) {
    return editor.document[0].children.map((c) => [
      c.id,
      c.children.map((block) => block.id),
    ]);
  }

  it("keeps a block that another writer moved into a column whose block the client removes", () => {
    const editor = createColumnsEditor([
      column("c1", "a", "Alpha"),
      column("c2", "b", "Beta"),
      column("c3", "g", "Gamma"),
    ]);
    const client = read(editor);
    // Another writer moves End into column c2.
    editor.removeBlocks(["end"]);
    editor.insertBlocks(
      [{ id: "end", type: "paragraph", content: "End" }],
      "b",
      "after",
    );

    write(editor, client, (text) => replaceOnce(text, "Beta\n\n", ""));

    expect(columnsShape(editor)).toEqual([
      ["c1", ["a"]],
      ["c2", ["end"]],
      ["c3", ["g"]],
    ]);
  });

  it("keeps a column that another writer added, when the client removes the block of another column", () => {
    const editor = createColumnsEditor([
      column("c1", "a", "Alpha"),
      column("c2", "b", "Beta"),
    ]);
    const client = read(editor);
    // Another writer adds a third column.
    editor.insertBlocks([column("c3", "g", "Gamma")], "c2", "after");

    write(editor, client, (text) => replaceOnce(text, "Alpha\n\n", ""));

    expect(editor.getBlock("g")).toBeDefined();
    expect(editor.getBlock("b")).toBeDefined();
    expect(editor.getBlock("a")).toBeUndefined();
  });

  it("removes a column that the client empties, if no other writer changed it", () => {
    const editor = createColumnsEditor([
      column("c1", "a", "Alpha"),
      column("c2", "b", "Beta"),
      column("c3", "g", "Gamma"),
    ]);
    const client = read(editor);
    editor.updateBlock("end", { content: "End, edited" });

    write(editor, client, (text) => replaceOnce(text, "Beta\n\n", ""));

    expect(columnsShape(editor)).toEqual([
      ["c1", ["a"]],
      ["c3", ["g"]],
    ]);
  });

  it("dissolves a column list with one column left, after the client empties the other column", () => {
    const editor = createColumnsEditor([
      column("c1", "a", "Alpha"),
      column("c2", "b", "Beta"),
    ]);
    const client = read(editor);
    editor.updateBlock("end", { content: "End, edited" });

    write(editor, client, (text) => replaceOnce(text, "Alpha\n\n", ""));

    expect(editor.document.map((block) => block.id)).toEqual(["b", "end"]);
  });

  it("keeps a column with an empty paragraph, also with a base", () => {
    const editor = createColumnsEditor([
      {
        id: "cA",
        type: "column",
        children: [
          { id: "empty", type: "paragraph", props: { backgroundColor: "red" } },
        ],
      },
      column("cB", "x", "Xray"),
      column("cC", "y", "Yankee"),
    ]);
    const client = read(editor);

    write(editor, client, (text) => replaceOnce(text, "Xray\n\n", ""));

    expect(columnsShape(editor)).toEqual([
      ["cA", ["empty"]],
      ["cC", ["y"]],
    ]);
  });

  it("puts the blocks of a new column where the column list was, if another writer removed the column list", () => {
    const editor = createColumnsEditor([
      column("c1", "a", "Alpha"),
      column("c2", "b", "Beta"),
    ]);
    const base = editor.document;
    const text = replaceOnce(
      getDocumentText(editor, htmlFormat),
      "Beta</p></div>",
      'Beta</p></div><div class="bn-block-column"><p>Gamma</p><p>Delta</p></div>',
    );
    // Another writer removes the column list.
    editor.removeBlocks(["list"]);

    valid(updateDocumentFromText(editor, { format: htmlFormat, text, base }));

    expect(
      editor.document.map((block) => [block.type, block.content]),
    ).toMatchObject([
      ["paragraph", [{ text: "Gamma" }]],
      ["paragraph", [{ text: "Delta" }]],
      ["paragraph", [{ text: "End" }]],
    ]);
  });
});

describe("a write from an older version, with a table", () => {
  function createTableEditor() {
    return createEditor([
      {
        id: "t",
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["Head A", "Head B"] },
            {
              cells: [
                "alpha",
                {
                  type: "tableCell",
                  props: { backgroundColor: "yellow" },
                  content: ["beta"],
                },
              ],
            },
            { cells: ["gamma", "delta"] },
          ],
        },
      },
    ]);
  }
  /** The text and the background color of each cell. */
  function cells(editor: BlockNoteEditor<any, any, any>) {
    const content = editor.getBlock("t")?.content as {
      rows: {
        cells: {
          content: { text: string }[];
          props: Record<string, unknown>;
        }[];
      }[];
    };
    return content.rows.map((row) =>
      row.cells.map(
        (cell) =>
          `${cell.content.map((item) => item.text).join("")}:${cell.props.backgroundColor}`,
      ),
    );
  }
  /** Another writer changes the text and the color of the cell "beta". */
  function changeCell(editor: BlockNoteEditor<any, any, any>, color: string) {
    editor.updateBlock("t", {
      content: {
        type: "tableContent",
        rows: [
          { cells: ["Head A", "Head B"] },
          {
            cells: [
              "alpha",
              {
                type: "tableCell",
                props: { backgroundColor: color },
                content: ["beta two"],
              },
            ],
          },
          { cells: ["gamma", "delta"] },
        ],
      },
    });
  }

  it("keeps the change of another writer to a different cell", () => {
    const editor = createTableEditor();
    const client = read(editor);
    changeCell(editor, "red");

    write(editor, client, (text) => replaceOnce(text, "gamma", "gamma two"));

    expect(cells(editor)).toEqual([
      ["Head A:default", "Head B:default"],
      ["alpha:default", "beta two:red"],
      ["gamma two:default", "delta:default"],
    ]);
  });

  it("keeps the change of another writer to a cell, if the client adds a row", () => {
    const editor = createTableEditor();
    const client = read(editor);
    changeCell(editor, "yellow");

    write(editor, client, (text) => {
      const lines = text.split("\n");
      const gamma = lines.findIndex((line) => line.includes("gamma"));
      lines.splice(gamma + 1, 0, "| epsilon | zeta |");
      return lines.join("\n");
    });

    expect(cells(editor)).toEqual([
      ["Head A:default", "Head B:default"],
      ["alpha:default", "beta two:yellow"],
      ["gamma:default", "delta:default"],
      ["epsilon:default", "zeta:default"],
    ]);
  });
});
