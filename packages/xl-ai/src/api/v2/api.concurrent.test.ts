import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  computeOperations,
  type DocumentChange,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  updateDocument,
} from "./index.js";
import { flattenBlocks } from "./util/blocks/flatten.js";
import type { LensBlock } from "./model.js";
import {
  blockFieldsById,
  columnSchema,
  createEditor,
  diffBlocks,
  documentShape,
  fruitDocument,
  replaceOnce,
} from "./testUtil/fixtures.js";
import {
  createRandom,
  type Random,
  randomDocument,
  randomEdit,
} from "./testUtil/random.js";
import { formatCases } from "./testUtil/codecs.js";
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
    updateDocument(editor, {
      format,
      text: edit(client.text),
      base: client.base,
    }),
  );
}

describe("a write without `base`", () => {
  // The type requires `base`, but a caller without types can forget it.
  it.each([
    [
      "computeOperations",
      (editor: BlockNoteEditor<any, any, any>) =>
        computeOperations(editor, {
          format: markdownFormat,
          text: "Hello",
        } as never),
    ],
    [
      "updateDocument",
      (editor: BlockNoteEditor<any, any, any>) =>
        updateDocument(editor, {
          format: markdownFormat,
          text: "Hello",
        } as never),
    ],
    [
      "updateDocument",
      (editor: BlockNoteEditor<any, any, any>) =>
        updateDocument(editor, { document: [] } as never),
    ],
  ])("%s throws an error, and does not change the document", (_, write) => {
    const editor = createEditor();
    const before = editor.document;

    expect(() => write(editor)).toThrow(/needs the option `base`/);
    expect(editor.document).toEqual(before);
  });
});

describe("a write from an older version", () => {
  it("changes nothing if the client did not change the text", () => {
    const editor = createEditor();
    const client = read(editor);
    write(editor, read(editor), (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
    );

    expect(
      valid(computeOperations(editor, { format, ...client })).operations,
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
    const editor = createEditor(fruitDocument);
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
    const editor = createEditor(fruitDocument);
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
 * Random groups of two to four writers. Each writer reads a version, edits
 * its text, and writes it later, with the version that it read as the base.
 * The reads and the writes come in a random order. Thus, a writer can read a
 * version that contains the writes of some other writers. Each case has a
 * seed.
 *
 * The result must contain the change of each writer to each block that no
 * other writer changed or removed. A change is the result of the write of
 * that writer alone, on the version that it read. One exception: a block
 * that a writer removed stays if it holds a block that the writer did not
 * read (a new block of another writer; see `mergeDocument`). After the last
 * write, a write of the text of the result must change nothing.
 */
describe.each(formatCases)(
  "random groups of writers ($name)",
  ({ format, codec }) => {
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
          2 + random.int(3),
        )) {
          if (step === "read") {
            const base: LensBlock[] = editor.document;
            const text = randomEdit(
              random,
              getDocumentText(editor, format),
              codec,
            );
            writers[writer] = { base, text, change: alone(base, text) };
          } else {
            const { base, text } = writers[writer];
            valid(updateDocument(editor, { format, text, base }));
          }
        }
        const result = blockFieldsById(editor);

        const flat = flattenBlocks(editor.document as LensBlock[]);
        const ids = flat.map(({ block }) => block.id);
        expect(new Set(ids).size).toBe(ids.length);
        /** The IDs of the blocks in block `id` of the result, at each depth. */
        const inside = (id: string): string[] => {
          const index = ids.indexOf(id);
          return flat.flatMap(({ block }, k) => {
            for (
              let p = flat[k].parentIndex;
              p !== undefined;
              p = flat[p].parentIndex
            ) {
              if (p === index) {
                return [block.id];
              }
            }
            return [];
          });
        };

        writers.forEach(({ base, change }, writer) => {
          const others = writers.filter((_, other) => other !== writer);
          const untouched = (id: string) =>
            others.every(
              ({ change }) =>
                !change.changed.includes(id) && !change.removed.includes(id),
            );
          for (const id of change.changed.filter(untouched)) {
            expect(result.get(id), `block ${id}`).toEqual(change.after.get(id));
          }
          const read = new Set(
            flattenBlocks(base).map(({ block }) => block.id),
          );
          for (const id of change.removed.filter(untouched)) {
            const holdsUnreadBlock =
              result.has(id) && inside(id).some((child) => !read.has(child));
            expect(result.has(id) && !holdsUnreadBlock, `block ${id}`).toBe(
              false,
            );
          }
        });

        const text = getDocumentText(editor, format);
        expect(
          valid(computeOperations(editor, { base: "current", format, text }))
            .operations,
        ).toEqual([]);

        /** Returns the changes of one writer alone, by block ID. */
        function alone(base: LensBlock[], text: string): Writer["change"] {
          const single = BlockNoteEditor.create({ initialContent: base });
          const before = blockFieldsById(single);
          valid(updateDocument(single, { base: "current", format, text }));
          const after = blockFieldsById(single);
          return { after, ...diffBlocks(before, after) };
        }
      },
    );
  },
);

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

describe("a move by the client and an insert by another writer next to the moved block", () => {
  it("puts the block at the place of the client, and keeps the new block of the other writer", () => {
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "A" },
      { id: "x", type: "paragraph", content: "X" },
      { id: "b", type: "paragraph", content: "B" },
      { id: "c", type: "paragraph", content: "C" },
    ]);
    const base = structuredClone(editor.document) as LensBlock[];
    // Another writer inserts Y before X.
    editor.insertBlocks(
      [{ id: "y", type: "paragraph", content: "Y" }],
      "x",
      "before",
    );

    // The client read the base, and moves X to the end.
    const [a, x, b, c] = base;
    const result = updateDocument(editor, {
      document: [a, b, c, x],
      base,
    });

    expect(result.error).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "a",
      "y",
      "b",
      "c",
      "x",
    ]);
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

    // The text moves X after New. Q stays in X, where the other writer put it.
    const [, inserted] = editor.document;
    expect(inserted.content).toMatchObject([{ text: "New" }]);
    expect(documentShape(editor.document)).toEqual([
      "p",
      inserted.id,
      "x",
      ["q"],
    ]);
  });
});

describe("a write from an older version with a conflict", () => {
  it("keeps the change of another writer, with a warning, if the client changes the same word", () => {
    const editor = createEditor(fruitDocument);
    const client = read(editor);
    editor.updateBlock("end", { content: "The finish" });

    const update = write(editor, client, (text) =>
      replaceOnce(text, "End", "Stop"),
    );

    expect(update.warnings).toEqual([
      { type: "conflicting-change", id: "end" },
    ]);
    expect(editor.getBlock("end")?.content).toMatchObject([
      { text: "The finish" },
    ]);
  });

  it("keeps the type of another writer, with a warning, if that type cannot hold the text of the client", () => {
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
      type: "image",
      props: { url: "https://example.com/a.png" },
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
    // The split stays, and the text does not show two times.
    expect(getDocumentText(editor, format)).toBe(
      "First half of the text.\n\nSecond half of the text.\n",
    );
  });

  it("keeps a sentence that another writer removed, with a warning, if the client changes it", () => {
    const editor = createEditor([
      {
        id: "p",
        type: "paragraph",
        content: "Alpha one. Beta two. Gamma three.",
      },
    ]);
    const client = read(editor);
    editor.updateBlock("p", { content: "Alpha one. Gamma three." });

    const update = write(editor, client, (text) =>
      replaceOnce(text, "Beta two.", "Beta 2."),
    );

    expect(update.warnings).toEqual([{ type: "conflicting-change", id: "p" }]);
    // The removed sentence does not come back.
    expect(getDocumentText(editor, format)).toBe("Alpha one. Gamma three.\n");
  });

  it("keeps a sentence that another writer adds, without a warning, if the client rewrites the rest of the block", () => {
    const editor = createEditor([
      { id: "p", type: "paragraph", content: "The cat sat on the mat." },
    ]);
    const client = read(editor);
    editor.updateBlock("p", {
      content: "The cat sat on the mat. It was warm.",
    });

    const update = write(editor, client, () => "A cat was sitting on a mat.\n");

    expect(update.warnings).toEqual([]);
    expect(getDocumentText(editor, format)).toBe(
      "A cat was sitting on a mat. It was warm.\n",
    );
  });

  it("keeps the parent of another writer, with a warning, if the client moves the block into a different parent", () => {
    const items: PartialBlock[] = ["a", "b", "c"].map((id) => ({
      id,
      type: "bulletListItem",
      content: id.toUpperCase(),
    }));
    const editor = createEditor(items);
    const client = read(editor);
    // Another writer indents C under A.
    editor.removeBlocks(["c"]);
    editor.updateBlock("a", {
      children: [{ id: "c", type: "bulletListItem", content: "C" }],
    });

    // The client indents C under B.
    const update = write(editor, client, (text) =>
      replaceOnce(text, "* C", "  * C"),
    );

    expect(update.warnings).toEqual([{ type: "conflicting-change", id: "c" }]);
    expect(documentShape(editor.document)).toEqual(["a", ["c"], "b"]);
  });
});

describe("a write from an older version with onConflict", () => {
  function writeWith(
    editor: BlockNoteEditor<any, any, any>,
    client: ReturnType<typeof read>,
    text: string,
    onConflict: "keep-current" | "reject",
  ) {
    return updateDocument(editor, {
      format,
      text,
      base: client.base,
      onConflict,
    });
  }

  it("rejects a write with a conflict, and does not change the document", () => {
    const editor = createEditor(fruitDocument);
    const client = read(editor);
    editor.updateBlock("end", { content: "The finish" });
    const before = editor.document;

    const update = writeWith(
      editor,
      client,
      replaceOnce(replaceOnce(client.text, "End", "Stop"), "Fruit", "Fruits"),
      "reject",
    );

    expect(update).toEqual({
      error: "conflict",
      conflicts: [{ type: "conflicting-change", id: "end" }],
    });
    expect(editor.document).toEqual(before);
  });

  it("rejects a write that removes a block that another writer changed", () => {
    const editor = createEditor(fruitDocument);
    const client = read(editor);
    editor.updateBlock("end", { content: "The end" });

    const update = writeWith(
      editor,
      client,
      replaceOnce(client.text, "End", ""),
      "reject",
    );

    expect(update).toEqual({
      error: "conflict",
      conflicts: [{ type: "removed-changed-block", id: "end" }],
    });
  });

  it("applies a write without a conflict, also with reject", () => {
    const editor = createEditor(fruitDocument);
    const client = read(editor);
    editor.updateBlock("end", { content: "The finish" });

    const update = valid(
      writeWith(
        editor,
        client,
        replaceOnce(client.text, "Fruit", "Fruits"),
        "reject",
      ),
    );

    expect(update.warnings).toEqual([]);
    expect(editor.getBlock("fruit")?.content).toMatchObject([
      { text: "Fruits" },
    ]);
    expect(editor.getBlock("end")?.content).toMatchObject([
      { text: "The finish" },
    ]);
  });

  it("keeps the current document in a conflict with keep-current, the default", () => {
    const run = (onConflict: "keep-current" | undefined) => {
      const editor = createEditor(fruitDocument);
      const client = read(editor);
      editor.updateBlock("end", { content: "The finish" });
      const text = replaceOnce(
        replaceOnce(client.text, "End", "Stop"),
        "Fruit",
        "Fruits",
      );
      const update = valid(
        onConflict === undefined
          ? updateDocument(editor, { format, text, base: client.base })
          : writeWith(editor, client, text, onConflict),
      );
      return { warnings: update.warnings, document: blockFieldsById(editor) };
    };

    const keepCurrent = run("keep-current");
    expect(keepCurrent.warnings).toEqual([
      { type: "conflicting-change", id: "end" },
    ]);
    expect(run(undefined)).toEqual(keepCurrent);
  });

  it("needs base for onConflict (a type error without base)", () => {
    // @ts-expect-error: a write without base has no conflicts.
    const options: DocumentChange = {
      format,
      text: "",
      onConflict: "reject",
    };
    expect(options.onConflict).toBe("reject");
  });
});

describe("a write from an older version that removes blocks", () => {
  it("keeps a block that another writer changed, with a warning", () => {
    const editor = createEditor(fruitDocument);
    const client = read(editor);
    editor.updateBlock("end", { content: "The end" });

    const update = write(editor, client, (text) =>
      replaceOnce(text, "End", ""),
    );

    expect(update.warnings).toEqual([
      { type: "removed-changed-block", id: "end" },
    ]);
    expect(editor.getBlock("end")?.content).toMatchObject([
      { text: "The end" },
    ]);
  });

  it("keeps a block and its child that another writer changed, with a warning, and removes the other child", () => {
    const editor = createEditor(fruitDocument);
    const client = read(editor);
    editor.updateBlock("pears", { content: "Green pears" });

    // The client removes Fruit and its children.
    const update = write(editor, client, () => "End\n");

    expect(update.warnings).toEqual([
      { type: "removed-changed-block", id: "fruit" },
    ]);
    expect(documentShape(editor.document)).toEqual(["fruit", ["pears"], "end"]);
    expect(editor.getBlock("pears")?.content).toMatchObject([
      { text: "Green pears" },
    ]);
  });

  it("removes a child that another writer moved out of a block that the client removes", () => {
    const editor = createEditor(fruitDocument);
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
      schema: columnSchema,
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

    // Column c1 is empty, thus it goes. Two columns stay.
    expect(documentShape(editor.document)).toEqual([
      "list",
      ["c2", ["b"], "c3", ["g"]],
      "end",
    ]);
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

    valid(updateDocument(editor, { format: htmlFormat, text, base }));

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
                { type: "tableCell", content: "alpha" },
                {
                  type: "tableCell",
                  props: { backgroundColor: "yellow" },
                  content: "beta",
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
          `${cell.content.map((item) => item.text).join("")}:${String(cell.props.backgroundColor)}`,
      ),
    );
  }
  /** Another writer changes the text and the color of the cell "beta". */
  function changeCell(editor: BlockNoteEditor<any, any, any>, color: string) {
    const update: PartialBlock = {
      content: {
        type: "tableContent",
        rows: [
          { cells: ["Head A", "Head B"] },
          {
            cells: [
              { type: "tableCell", content: "alpha" },
              {
                type: "tableCell",
                props: { backgroundColor: color },
                content: "beta two",
              },
            ],
          },
          { cells: ["gamma", "delta"] },
        ],
      },
    };
    editor.updateBlock("t", update);
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

/** The props of a block of the editor, as a record (the props of all block types). */
function propsOf(
  editor: { getBlock: (id: string) => { props: object } | undefined },
  id: string,
): Record<string, unknown> {
  return (editor.getBlock(id)?.props ?? {}) as Record<string, unknown>;
}

describe("a write from an older version that removes props", () => {
  /** The document at the version that the client read: a red paragraph. */
  function setup(textColor = "red") {
    const editor = createEditor([
      { id: "p", type: "paragraph", props: { textColor }, content: "Hello" },
      { id: "e", type: "paragraph", content: "End" },
    ]);
    return { editor, base: editor.document };
  }
  /** A write of another writer: the paragraph with these props and text. */
  function otherWriter(
    editor: BlockNoteEditor<any, any, any>,
    props: Record<string, string>,
    text = "Hello",
  ) {
    valid(
      updateDocument(editor, {
        base: "current",
        document: [
          { id: "p", type: "paragraph", props, content: text },
          { id: "e", type: "paragraph", content: "End" },
        ],
      }),
    );
  }
  /** The write of the client from `base`: the paragraph with these props and text. */
  function client(
    editor: BlockNoteEditor<any, any, any>,
    base: typeof editor.document,
    props: Record<string, string>,
    text = "Hello",
  ) {
    return valid(
      updateDocument(editor, {
        base,
        document: [
          { id: "p", type: "paragraph", props, content: text },
          { id: "e", type: "paragraph", content: "End" },
        ],
      }),
    );
  }

  it("removes a prop that the client removes and another writer did not change", () => {
    const { editor, base } = setup();
    const { warnings } = client(editor, base, {});
    expect(propsOf(editor, "p").textColor).toBe("default");
    expect(warnings).toEqual([]);
  });

  it("keeps the change of another writer to a prop that the client removes, with a warning", () => {
    const { editor, base } = setup();
    otherWriter(editor, { textColor: "blue" });
    const { warnings } = client(editor, base, {});
    expect(propsOf(editor, "p").textColor).toBe("blue");
    expect(warnings).toEqual([{ type: "conflicting-change", id: "p" }]);
  });

  it("keeps the removal of another writer if the client changed only the text", () => {
    const { editor, base } = setup();
    otherWriter(editor, {});
    const { warnings } = client(
      editor,
      base,
      { textColor: "red" },
      "Hello you",
    );
    expect(editor.getBlock("p")).toMatchObject({
      props: { textColor: "default" },
      content: [{ text: "Hello you" }],
    });
    expect(warnings).toEqual([]);
  });

  it("keeps the removal of another writer, with a warning, if the client changed the prop", () => {
    const { editor, base } = setup();
    otherWriter(editor, {});
    const { warnings } = client(editor, base, { textColor: "green" });
    expect(propsOf(editor, "p").textColor).toBe("default");
    expect(warnings).toEqual([{ type: "conflicting-change", id: "p" }]);
  });

  it("removes a prop one time, without a warning, if the two sides removed it", () => {
    const { editor, base } = setup();
    otherWriter(editor, {});
    const { warnings } = client(editor, base, {});
    expect(propsOf(editor, "p").textColor).toBe("default");
    expect(warnings).toEqual([]);
  });

  it("keeps the removal of an optional prop by another writer if the client changed a different prop", () => {
    const url = "https://example.com/x.png";
    const editor = createEditor([
      { id: "i", type: "image", props: { url, previewWidth: 200 } },
    ]);
    const base = editor.document;
    valid(
      updateDocument(editor, {
        base: "current",
        document: [{ id: "i", type: "image", props: { url } }],
      }),
    );
    valid(
      updateDocument(editor, {
        base,
        document: [
          {
            id: "i",
            type: "image",
            props: { url, previewWidth: 200, caption: "Cap" },
          },
        ],
      }),
    );
    expect(editor.getBlock("i")?.props).toMatchObject({ caption: "Cap" });
    expect(propsOf(editor, "i").previewWidth).toBeUndefined();
  });

  it("keeps a new link URL of another writer if the client changed other text of the block", () => {
    const editor = createEditor([
      {
        id: "p",
        type: "paragraph",
        content: [
          "see ",
          { type: "link", href: "https://a.example", content: "docs" },
          " now",
        ],
      },
    ]);
    const base = editor.document;
    const linked = (href: string, after: string) => [
      {
        id: "p",
        type: "paragraph" as const,
        content: [
          "see ",
          { type: "link" as const, href, content: "docs" },
          after,
        ],
      },
    ];
    valid(
      updateDocument(editor, {
        base: "current",
        document: linked("https://b.example", " now"),
      }),
    );
    const { warnings } = valid(
      updateDocument(editor, {
        base,
        document: linked("https://a.example", " later"),
      }),
    );
    expect(editor.getBlock("p")?.content).toMatchObject([
      { text: "see " },
      { type: "link", href: "https://b.example", content: [{ text: "docs" }] },
      { text: " later" },
    ]);
    expect(warnings).toEqual([]);
  });
});
