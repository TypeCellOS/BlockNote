import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
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
import { createRandom, randomDocument, randomEdit } from "./testUtil/random.js";

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
  return updateDocumentFromText(editor, {
    format,
    text: edit(client.text),
    base: client.base,
  });
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

    expect(computeTextUpdate(editor, { format, ...client }).operations).toEqual(
      [],
    );
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
        updateDocumentFromText(single, { format, text: edited });
        const after = blockFieldsById(single);
        return { after, ...diffBlocks(before, after) };
      }
      const a = alone(textA);
      const b = alone(textB);

      updateDocumentFromText(editor, { format, text: textA });
      updateDocumentFromText(editor, { format, text: textB, base });
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
