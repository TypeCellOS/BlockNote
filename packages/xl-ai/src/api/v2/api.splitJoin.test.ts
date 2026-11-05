import {
  BlockNoteEditor,
  type Block,
  type PartialBlock,
} from "@blocknote/core";
import { blocksToYDoc } from "@blocknote/core/yjs";
import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import {
  getDocumentText,
  markdownFormat,
  updateDocumentFromJSON,
  updateDocumentFromText,
} from "./index.js";
import { canonicalText } from "./testUtil/canonical.js";
import { createEditor, replaceOnce, styledText } from "./testUtil/fixtures.js";
import {
  createRandom,
  type Random,
  randomSentence,
} from "./testUtil/random.js";
import { valid } from "./testUtil/valid.js";
import { bindEditor, readText } from "./testUtil/yjs.js";
import { updateYDocFromText } from "./yjs/index.js";

/**
 * The experimental text moves (`experimentalTextMoves`): a split or a join in
 * the text moves text from one block to another. The moved text keeps its
 * hidden styles, and the changes of other writers to it go to the block
 * that holds it after the write.
 */

const format = markdownFormat;

/** Writes the text with the experimental text moves. */
function write(
  editor: BlockNoteEditor<any, any, any>,
  text: string,
  base?: Block<any, any, any>[],
) {
  return valid(
    updateDocumentFromText(editor, {
      format,
      text,
      base,
      experimentalTextMoves: true,
    }),
  );
}

/** The ID, the props that are not default, and the content of each top-level block. */
function blocksOf(editor: BlockNoteEditor<any, any, any>) {
  return editor.document.map((block) => ({
    id: block.id,
    props: Object.fromEntries(
      Object.entries(block.props).filter(
        ([, value]) => value !== "default" && value !== "left",
      ),
    ),
    content: block.content,
  }));
}

describe("a split in the text", () => {
  it("gives the new part the hidden styles of its text", () => {
    const editor = createEditor([
      {
        id: "p",
        type: "paragraph",
        content: [
          { type: "text", text: "The first part has words. ", styles: {} },
          { type: "text", text: "Second", styles: { underline: true } },
          { type: "text", text: " part.", styles: {} },
        ],
      },
    ]);
    write(
      editor,
      replaceOnce(getDocumentText(editor, format), "words. ", "words.\n\n"),
    );

    const [first, second] = blocksOf(editor);
    expect(first).toMatchObject({
      id: "p",
      content: [styledText("The first part has words.")],
    });
    expect(second.content).toEqual([
      styledText("Second", { underline: true }),
      styledText(" part."),
    ]);
  });

  it("gives the new part the hidden props of the block", () => {
    const editor = createEditor([
      {
        id: "p",
        type: "paragraph",
        props: { textColor: "red", textAlignment: "center" },
        content: "The first part has words. Second part.",
      },
    ]);
    write(
      editor,
      replaceOnce(getDocumentText(editor, format), "words. ", "words.\n\n"),
    );

    expect(blocksOf(editor).map((block) => block.props)).toEqual([
      { textColor: "red", textAlignment: "center" },
      { textColor: "red", textAlignment: "center" },
    ]);
  });

  it("keeps the ID on the first part, also if the second part is larger", () => {
    const editor = createEditor([
      {
        id: "p",
        type: "paragraph",
        content: "First part. The second part has many more words.",
      },
    ]);
    write(
      editor,
      replaceOnce(getDocumentText(editor, format), "part. ", "part.\n\n"),
    );

    expect(editor.document[0].id).toBe("p");
    expect(editor.document[1].id).not.toBe("p");
  });
});

describe("a join in the text", () => {
  it("keeps the hidden styles of the text of the second block", () => {
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "First paragraph here." },
      {
        id: "b",
        type: "paragraph",
        props: { textColor: "blue" },
        content: [
          { type: "text", text: "Second ", styles: {} },
          { type: "text", text: "underlined", styles: { underline: true } },
          { type: "text", text: " text.", styles: {} },
        ],
      },
    ]);
    write(
      editor,
      replaceOnce(
        getDocumentText(editor, format),
        "here.\n\nSecond",
        "here. Second",
      ),
    );

    // The joined block has the props of the first block.
    expect(blocksOf(editor)).toEqual([
      {
        id: "a",
        props: {},
        content: [
          styledText("First paragraph here. Second "),
          styledText("underlined", { underline: true }),
          styledText(" text."),
        ],
      },
    ]);
  });
});

/** A client reads the text. Then another writer changes the document. */
function readThenChange(
  blocks: PartialBlock[],
  change: (editor: BlockNoteEditor<any, any, any>) => void,
) {
  const editor = createEditor(blocks);
  const client = {
    text: getDocumentText(editor, format),
    base: editor.document,
  };
  change(editor);
  return { editor, client };
}

describe("a split by the client, from an older version", () => {
  it("gives the change of another writer to the second part to the new block", () => {
    const { editor, client } = readThenChange(
      [{ id: "p", type: "paragraph", content: "First part. Second part." }],
      (editor) =>
        editor.updateBlock("p", {
          content: "First part. Second part changed.",
        }),
    );

    const update = write(
      editor,
      replaceOnce(client.text, "part. ", "part.\n\n"),
      client.base,
    );

    expect(update.warnings).toEqual([]);
    expect(getDocumentText(editor, format)).toBe(
      "First part.\n\nSecond part changed.\n",
    );
    expect(editor.document[0].id).toBe("p");
  });

  it("keeps the change of another writer to the first part in the block with the ID", () => {
    const { editor, client } = readThenChange(
      [
        {
          id: "p",
          type: "paragraph",
          content: "First part. The second part is much longer here.",
        },
      ],
      (editor) =>
        editor.updateBlock("p", {
          content: "First part changed. The second part is much longer here.",
        }),
    );

    const update = write(
      editor,
      replaceOnce(client.text, "part. ", "part.\n\n"),
      client.base,
    );

    expect(update.warnings).toEqual([]);
    expect(getDocumentText(editor, format)).toBe(
      "First part changed.\n\nThe second part is much longer here.\n",
    );
    expect(editor.document[0].id).toBe("p");
  });

  it("keeps the text of another writer, with a warning, if that writer changed the text at the split", () => {
    const { editor, client } = readThenChange(
      [
        {
          id: "p",
          type: "paragraph",
          content: "Alpha beta gamma. Delta epsilon.",
        },
      ],
      (editor) =>
        editor.updateBlock("p", {
          content: "Alpha beta gamma, delta epsilon.",
        }),
    );

    const update = write(
      editor,
      replaceOnce(client.text, "gamma. ", "gamma.\n\n"),
      client.base,
    );

    // The text at the split is a conflict: the text of the other writer
    // stays, and the split does not apply. The text does not show two times.
    expect(update.warnings).toEqual([{ type: "conflicting-change", id: "p" }]);
    expect(getDocumentText(editor, format)).toBe(
      "Alpha beta gamma, delta epsilon.\n",
    );
  });
});

describe("a join by the client, from an older version", () => {
  const blocks: PartialBlock[] = [
    { id: "a", type: "paragraph", content: "First block." },
    { id: "b", type: "paragraph", content: "Second block." },
  ];
  const join = (value: string) =>
    replaceOnce(value, "block.\n\nSecond", "block. Second");

  it("keeps the change of another writer to the second block in the joined block", () => {
    const { editor, client } = readThenChange(blocks, (editor) =>
      editor.updateBlock("b", { content: "Second block, edited." }),
    );

    const update = write(editor, join(client.text), client.base);

    expect(update.warnings).toEqual([]);
    expect(getDocumentText(editor, format)).toBe(
      "First block. Second block, edited.\n",
    );
    expect(editor.document.map((block) => block.id)).toEqual(["a"]);
  });

  it("does not join, with a warning, if another writer changed the props of the second block", () => {
    const { editor, client } = readThenChange(blocks, (editor) =>
      editor.updateBlock("b", { props: { textColor: "red" } }),
    );

    const update = write(editor, join(client.text), client.base);

    expect(update.warnings).toContainEqual({
      type: "removed-changed-block",
      id: "b",
    });
    expect(getDocumentText(editor, format)).toBe(
      "First block.\n\nSecond block.\n",
    );
    expect(blocksOf(editor)[1]).toMatchObject({
      id: "b",
      props: { textColor: "red" },
    });
  });

  it("does not add the text of the second block, if another writer removed it", () => {
    const { editor, client } = readThenChange(blocks, (editor) =>
      editor.removeBlocks(["b"]),
    );

    const update = write(editor, join(client.text), client.base);

    expect(update.warnings).toEqual([{ type: "conflicting-change", id: "a" }]);
    expect(getDocumentText(editor, format)).toBe("First block.\n");
  });
});

describe("a split or a join of another writer, and a write from an older version", () => {
  const blocks: PartialBlock[] = [
    { id: "a", type: "paragraph", content: "First block." },
    { id: "b", type: "paragraph", content: "Second block." },
  ];
  function joinByOtherWriter(editor: BlockNoteEditor<any, any, any>) {
    editor.updateBlock("a", { content: "First block. Second block." });
    editor.removeBlocks(["b"]);
  }

  it("gives the change of the client to the second part of a block that another writer split", () => {
    const { editor, client } = readThenChange(
      [{ id: "a", type: "paragraph", content: "First half. Second half." }],
      (editor) => {
        editor.updateBlock("a", { content: "First half." });
        editor.insertBlocks(
          [{ id: "a2", type: "paragraph", content: "Second half." }],
          "a",
          "after",
        );
      },
    );

    const update = write(
      editor,
      replaceOnce(client.text, "Second half.", "Second half, changed."),
      client.base,
    );

    expect(update.warnings).toEqual([]);
    expect(getDocumentText(editor, format)).toBe(
      "First half.\n\nSecond half, changed.\n",
    );
    expect(editor.document.map((block) => block.id)).toEqual(["a", "a2"]);
  });

  it("gives the change of the client to the second block to the block that another writer joined", () => {
    const { editor, client } = readThenChange(blocks, joinByOtherWriter);

    const update = write(
      editor,
      replaceOnce(client.text, "Second block.", "Second block, edited."),
      client.base,
    );

    expect(update.warnings).toEqual([]);
    expect(getDocumentText(editor, format)).toBe(
      "First block. Second block, edited.\n",
    );
  });

  it("does not apply a change of the type of a block that another writer joined, and gives a warning", () => {
    const { editor, client } = readThenChange(blocks, joinByOtherWriter);

    const update = write(
      editor,
      replaceOnce(client.text, "Second block.", "## Second block."),
      client.base,
    );

    expect(update.warnings).toEqual([
      { type: "change-to-removed-block", id: "b" },
    ]);
    expect(getDocumentText(editor, format)).toBe(
      "First block. Second block.\n",
    );
  });

  it("gives the change of a JSON write to the block that another writer joined", () => {
    const { editor, client } = readThenChange(blocks, joinByOtherWriter);

    const update = valid(
      updateDocumentFromJSON(editor, {
        document: client.base.map((block) =>
          block.id === "b"
            ? { ...block, content: "Second block, edited." }
            : block,
        ),
        base: client.base,
        experimentalTextMoves: true,
      }),
    );

    expect(update.warnings).toEqual([]);
    expect(getDocumentText(editor, format)).toBe(
      "First block. Second block, edited.\n",
    );
  });
});

describe("a split or a join of the client in a Y.Doc", () => {
  it("gives the changes of another writer to the moved text to the block that holds it", () => {
    const reader = BlockNoteEditor.create();
    const ydoc = blocksToYDoc(
      reader,
      BlockNoteEditor.create({
        initialContent: [
          { id: "a", type: "paragraph", content: "First part. Second part." },
          { id: "b", type: "paragraph", content: "Third block." },
        ],
      }).document,
    );
    const fragment = ydoc.getXmlFragment("prosemirror");
    const editor = bindEditor(fragment);
    const client = {
      text: getDocumentText(editor, format),
      base: Y.encodeStateAsUpdate(ydoc),
    };
    const other = bindEditor(fragment);
    other.updateBlock("a", { content: "First part. Second part, edited." });
    other.updateBlock("b", { content: "Third block, edited." });
    other._tiptapEditor.destroy();

    // The client splits the first block and joins the second block to it.
    const update = valid(
      updateYDocFromText(editor, fragment, {
        format,
        text: "First part.\n\nSecond part. Third block.\n",
        base: client.base,
        experimentalTextMoves: true,
      }),
    );

    expect(update.warnings).toEqual([]);
    expect(readText(fragment, format)).toBe(
      "First part.\n\nSecond part, edited. Third block, edited.\n",
    );
  });
});

/** A change of a text: `length` characters at `at` become `text`. */
type TextEdit = { at: number; length: number; text: string };

function applyEdits(value: string, edits: readonly TextEdit[]): string {
  let result = value;
  for (const edit of [...edits].sort((x, y) => y.at - x.at)) {
    result =
      result.slice(0, edit.at) +
      edit.text +
      result.slice(edit.at + edit.length);
  }
  return result;
}

/** The paragraphs of a markdown text with only words, emoji, spaces and periods, with their positions. */
function plainParagraphs(value: string) {
  let at = 0;
  return value.split("\n\n").flatMap((paragraph) => {
    const start = at;
    at += paragraph.length + 2;
    return /^\p{L}[\p{L}\p{Extended_Pictographic} .]*$/u.test(paragraph)
      ? [{ start, end: start + paragraph.length }]
      : [];
  });
}

/** A random split of a paragraph at a space, or a join of two paragraphs. */
function splitOrJoin(random: Random, value: string): TextEdit | undefined {
  const paragraphs = plainParagraphs(value);
  const joins = paragraphs.flatMap((paragraph, k) =>
    paragraphs[k + 1]?.start === paragraph.end + 2
      ? [{ at: paragraph.end, length: 2, text: " " }]
      : [],
  );
  const splits = paragraphs.flatMap(({ start, end }) =>
    [...value.slice(start, end).matchAll(/ /g)].map((match) => ({
      at: start + match.index,
      length: 1,
      text: "\n\n",
    })),
  );
  const edits = random.chance(0.5) && joins.length > 0 ? joins : splits;
  return edits.length > 0 ? random.pick(edits) : undefined;
}

/** A random change of a word that is not next to `split` (thus, no conflict). */
function changeWord(
  random: Random,
  value: string,
  split: TextEdit,
): TextEdit | undefined {
  const words = plainParagraphs(value).flatMap(({ start, end }) =>
    [...value.slice(start, end).matchAll(/\p{L}+/gu)].map((match) => ({
      at: start + match.index,
      length: match[0].length,
      text: "zeta",
    })),
  );
  const far = words.filter(
    (word) =>
      word.at + word.length < split.at || word.at > split.at + split.length,
  );
  // Often a word of the moved text.
  const near = far.filter((word) => Math.abs(word.at - split.at) < 40);
  const candidates = random.chance(0.5) && near.length > 0 ? near : far;
  return candidates.length > 0 ? random.pick(candidates) : undefined;
}

/**
 * Paragraphs of random sentences, with data that markdown does not show: a
 * color, and an underlined word.
 */
function hiddenDataDocument(random: Random): PartialBlock[] {
  return Array.from({ length: 2 + random.int(6) }, () => {
    const [first, ...rest] = Array.from({ length: 1 + random.int(3) }, () =>
      randomSentence(random),
    )
      .join(" ")
      .split(" ");
    return {
      type: "paragraph",
      props: random.chance(0.5)
        ? { textColor: random.pick(["red", "blue"]) }
        : {},
      content: [
        { type: "text", text: first, styles: { underline: true } },
        { type: "text", text: ` ${rest.join(" ")}`, styles: {} },
      ],
    };
  });
}

/**
 * Random cases: one side splits or joins paragraphs, and the other side
 * changes a word that is not next to the split or the join. The other
 * writer writes first, the client writes from `base`. The result must have
 * the two changes, without a warning.
 */
function splitJoinCases(splitByClient: boolean) {
  it.each(Array.from({ length: 80 }, (_, i) => i + 1))(
    "keeps the two changes for seed %i",
    (seed) => {
      const random = createRandom(seed);
      const editor = createEditor(hiddenDataDocument(random));
      const base = editor.document;
      const value = getDocumentText(editor, format);
      const split = splitOrJoin(random, value);
      const word =
        split === undefined ? undefined : changeWord(random, value, split);
      if (split === undefined || word === undefined) {
        return;
      }
      const [other, client] = splitByClient ? [word, split] : [split, word];

      write(editor, applyEdits(value, [other]));
      const update = write(editor, applyEdits(value, [client]), base);

      expect(update.warnings).toEqual([]);
      expect(
        canonicalText(editor, format, getDocumentText(editor, format)),
      ).toBe(canonicalText(editor, format, applyEdits(value, [split, word])));
    },
  );
}

describe("a split or a join of the client, and a change of a different word, on random documents", () => {
  splitJoinCases(true);
});

describe("a split or a join of another writer, and a change of a different word, on random documents", () => {
  splitJoinCases(false);
});
