import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import {
  blocksToYDoc,
  updateYFragment,
  yDocToBlocks,
  yXmlFragmentToProseMirrorRootNode,
} from "@blocknote/core/yjs";
import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import {
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "../index.js";
import {
  addComment,
  commentedText,
  createCommentEditor,
} from "../testUtil/comments.js";
import {
  documentShape,
  replaceOnce,
  richDocument,
} from "../testUtil/fixtures.js";
import {
  getYDocText,
  type MergeStrategy,
  updateYDocFromText,
} from "./yDocText.js";
import { valid } from "../testUtil/valid.js";
import {
  createRandom,
  randomDocument,
  randomEdit,
  randomLineEdit,
} from "../testUtil/random.js";

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

function setup(initialContent: PartialBlock[] = richDocument) {
  const editor = BlockNoteEditor.create();
  const ydoc = blocksToYDoc(
    editor,
    BlockNoteEditor.create({ initialContent }).document,
  );
  const options = { format: markdownFormat };
  const blocks = () => yDocToBlocks(editor, ydoc);

  return {
    editor,
    ydoc,
    blocks,
    block: (id: string) => blocks().find((candidate) => candidate.id === id),
    /** A client reads the text. It keeps the Yjs state as the base of a later write. */
    read: () => ({
      text: getYDocText(editor, ydoc, options),
      base: Y.encodeStateAsUpdate(ydoc),
    }),
    /** A client writes back a changed copy of the text that it read. */
    write: (
      client: { text: string; base: Uint8Array },
      edit: (text: string) => string,
      strategy?: MergeStrategy,
    ) =>
      valid(
        updateYDocFromText(editor, ydoc, {
          ...options,
          text: edit(client.text),
          base: client.base,
          strategy,
        }),
      ),
    /** A user changes the document in an editor. */
    change: (edit: (editor: BlockNoteEditor<any, any, any>) => void) => {
      const userEditor = BlockNoteEditor.create({
        initialContent: blocks(),
        trailingBlock: false,
      });
      edit(userEditor);
      ydoc.transact(() =>
        updateYFragment(
          ydoc,
          ydoc.getXmlFragment("prosemirror"),
          userEditor.prosemirrorState.doc,
          { mapping: new Map(), isOMark: new Map() },
        ),
      );
    },
  };
}

describe("updateYDocFromText", () => {
  it("writes the changes of the text to the Y.Doc, and keeps hidden data", () => {
    const { read, write, block } = setup();
    write(read(), (text) =>
      replaceOnce(text, "Colored centered paragraph", "Colored text"),
    );

    expect(block("colored")).toMatchObject({
      props: { textColor: "red", backgroundColor: "blue" },
      content: [{ type: "text", text: "Colored text" }],
    });
  });

  it("changes nothing if the text did not change", () => {
    const { ydoc, read, write } = setup();
    const before = Y.encodeStateVector(ydoc);

    write(read(), (text) => text);

    expect(Y.encodeStateVector(ydoc)).toEqual(before);
  });

  it("returns the Yjs update for the other clients", () => {
    const { editor, ydoc, read, write, blocks } = setup();
    const replica = new Y.Doc();
    Y.applyUpdate(replica, Y.encodeStateAsUpdate(ydoc));

    const result = write(read(), (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
    );
    Y.applyUpdate(replica, result.update);

    expect(yDocToBlocks(editor, replica)).toEqual(blocks());
  });
});

describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
])("empty and cleared documents ($name)", ({ format }) => {
  const editor = BlockNoteEditor.create();

  /** The IDs of all blocks in the Y.Doc, from its XML. */
  function idsOf(ydoc: Y.Doc): (string | undefined)[] {
    return [
      ...ydoc
        .getXmlFragment("prosemirror")
        .createTreeWalker(
          (node) =>
            node instanceof Y.XmlElement && node.nodeName === "blockcontainer",
        ),
    ].map((node) => (node as Y.XmlElement).getAttribute("id"));
  }

  it("writes text to an empty Y.Doc", () => {
    const ydoc = new Y.Doc();
    valid(updateYDocFromText(editor, ydoc, { format, text: "Hello" }));

    expect(getYDocText(editor, ydoc, { format }).trim()).toBe("Hello");
    expect(idsOf(ydoc).every((id) => typeof id === "string")).toBe(true);
  });

  it("writes text with a base from an empty Y.Doc", () => {
    const ydoc = new Y.Doc();
    valid(
      updateYDocFromText(editor, ydoc, {
        format,
        text: "Hello",
        base: Y.encodeStateAsUpdate(ydoc),
      }),
    );

    expect(getYDocText(editor, ydoc, { format }).trim()).toBe("Hello");
  });

  it.each<MergeStrategy>(["rebase", "yjs"])(
    "keeps the text of another writer, if the base is an empty Y.Doc (strategy %s)",
    (strategy) => {
      const ydoc = new Y.Doc();
      const base = Y.encodeStateAsUpdate(ydoc);
      valid(updateYDocFromText(editor, ydoc, { format, text: "Other" }));
      valid(
        updateYDocFromText(editor, ydoc, {
          format,
          text: "Hello",
          base,
          strategy,
        }),
      );

      expect(getYDocText(editor, ydoc, { format }).trim()).toBe(
        "Hello\n\nOther",
      );
      expect(ydoc.getXmlFragment("prosemirror").length).toBe(1);
    },
  );

  it("clears a document, and writes text again", () => {
    const ydoc = blocksToYDoc(
      editor,
      BlockNoteEditor.create({
        initialContent: [{ type: "paragraph", content: "Old text" }],
      }).document,
    );
    valid(updateYDocFromText(editor, ydoc, { format, text: "" }));
    valid(updateYDocFromText(editor, ydoc, { format, text: "New text" }));

    expect(getYDocText(editor, ydoc, { format }).trim()).toBe("New text");
    expect(idsOf(ydoc).every((id) => typeof id === "string")).toBe(true);
  });
});

describe.each<MergeStrategy>(["rebase", "yjs"])(
  "concurrent writes (strategy %s)",
  (strategy) => {
    /** A test that fails with the "yjs" strategy, until the Yjs binding has a flat document model. */
    const itMoves = strategy === "yjs" ? it.fails : it;

    it("keeps the changes of other writers in different blocks", () => {
      const { read, write, block } = setup();
      const a = read();
      const b = read();

      write(b, (text) =>
        replaceOnce(text, "Last paragraph", "Last paragraph from B"),
      );
      write(
        a,
        (text) =>
          replaceOnce(text, "Colored centered paragraph", "Colored by A"),
        strategy,
      );

      expect(block("colored")?.content).toMatchObject([
        { text: "Colored by A" },
      ]);
      expect(block("last")?.content).toMatchObject([
        { text: "Last paragraph from B" },
      ]);
    });

    it("merges changes of two writers in the same paragraph", () => {
      const { read, write, block } = setup();
      const a = read();
      const b = read();

      write(b, (text) =>
        replaceOnce(text, "Last paragraph", "The last paragraph"),
      );
      write(
        a,
        (text) => replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
        strategy,
      );

      expect(block("last")?.content).toMatchObject([
        { text: "The last paragraph, edited" },
      ]);
    });

    it("keeps the change of another writer between two changes of the client in one paragraph", () => {
      const { read, write, block } = setup([
        { id: "p", type: "paragraph", content: "Alpha one two three Omega" },
      ]);
      const a = read();
      const b = read();

      write(b, (text) => replaceOnce(text, "two", "TWO"));
      write(
        a,
        (text) =>
          replaceOnce(replaceOnce(text, "Alpha", "First"), "Omega", "Last"),
        strategy,
      );

      expect(block("p")?.content).toMatchObject([
        { text: "First one TWO three Last" },
      ]);
    });

    it("keeps a block that another writer fully rewrote", () => {
      const { read, write, block } = setup();
      const a = read();
      const b = read();

      write(b, (text) =>
        replaceOnce(text, "Last paragraph", "Completely different words"),
      );
      write(
        a,
        (text) => replaceOnce(text, "Colored centered paragraph", "Colored"),
        strategy,
      );

      expect(block("last")?.content).toMatchObject([
        { text: "Completely different words" },
      ]);
      expect(block("colored")?.content).toMatchObject([{ text: "Colored" }]);
    });

    it("changes the correct block of two blocks with the same text", () => {
      const { read, write, change, block, blocks } = setup([
        { id: "x", type: "paragraph", content: "Same" },
        { id: "y", type: "paragraph", content: "Same" },
        { id: "z", type: "paragraph", content: "End" },
      ]);
      const client = read();

      change((editor) => editor.removeBlocks(["x"]));
      write(
        client,
        (text) => text.replace("Same\n\nEnd", "Changed\n\nEnd"),
        strategy,
      );

      expect(blocks().map((candidate) => candidate.id)).toEqual(["y", "z"]);
      expect(block("y")?.content).toMatchObject([{ text: "Changed" }]);
    });

    itMoves("keeps a change to a block that another user dragged", () => {
      const { read, write, change, block, blocks } = setup();
      const client = read();

      change((editor) => {
        const last = editor.getBlock("last");
        if (last === undefined) {
          throw new Error("Block not found");
        }
        editor.removeBlocks(["last"]);
        editor.insertBlocks([last], "colored", "before");
      });
      write(
        client,
        (text) => replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
        strategy,
      );

      expect(blocks().filter((candidate) => candidate.id === "last")).toEqual([
        block("last"),
      ]);
      expect(blocks()[0]).toMatchObject({
        id: "last",
        content: [{ text: "Last paragraph, edited" }],
      });
    });

    itMoves("does one move if two writers make the same move", () => {
      const { read, write, blocks } = setup(fruit);
      const a = read();
      const b = read();

      write(a, (text) => replaceOnce(text, "  * Pears", "* Pears"));
      write(b, (text) => replaceOnce(text, "  * Pears", "* Pears"), strategy);

      expect(documentShape(blocks())).toEqual([
        "fruit",
        ["apples"],
        "pears",
        "end",
      ]);
    });

    itMoves("keeps a change to a block that another writer moved", () => {
      const { read, write, block, blocks } = setup(fruit);
      const a = read();
      const b = read();

      write(a, (text) => replaceOnce(text, "  * Pears", "* Pears"));
      write(
        b,
        (text) => replaceOnce(text, "Pears", "Pears and plums"),
        strategy,
      );

      expect(documentShape(blocks())).toEqual([
        "fruit",
        ["apples"],
        "pears",
        "end",
      ]);
      expect(block("pears")?.content).toMatchObject([
        { text: "Pears and plums" },
      ]);
    });
  },
);

describe("concurrent writes (strategy rebase): conflicts", () => {
  it("does not apply a change to a block that another writer removed, and gives a warning", () => {
    const { read, write, change, block } = setup();
    const client = read();

    change((editor) => editor.removeBlocks(["last"]));
    const result = write(client, (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
    );

    expect(block("last")).toBeUndefined();
    expect(result.warnings).toEqual([
      { type: "change-to-removed-block", id: "last" },
    ]);
  });

  it("removes a block that another writer changed, and gives a warning", () => {
    const { read, write, change, block } = setup();
    const client = read();

    change((editor) =>
      editor.updateBlock("last", { props: { textColor: "green" } }),
    );
    const result = write(client, (text) =>
      replaceOnce(text, "\n\nLast paragraph", ""),
    );

    expect(block("last")).toBeUndefined();
    expect(result.warnings).toEqual([
      { type: "removed-changed-block", id: "last" },
    ]);
  });
});

describe.each<MergeStrategy>(["rebase", "yjs"])(
  "comments (strategy %s)",
  (strategy) => {
    /** A Y.Doc from an editor with comments. Block JSON does not contain comment marks, thus the test writes the ProseMirror document. */
    function setupWithComments() {
      const editor = createCommentEditor(fruit);
      const kept = addComment(editor, "Apples");
      const moved = addComment(editor, "Pears");
      const ydoc = new Y.Doc();
      const fragment = ydoc.getXmlFragment("prosemirror");
      updateYFragment(ydoc, fragment, editor.prosemirrorState.doc, {
        mapping: new Map(),
        isOMark: new Map(),
      });
      const write = (edit: (text: string) => string) =>
        valid(
          updateYDocFromText(editor, ydoc, {
            format: markdownFormat,
            text: edit(getYDocText(editor, ydoc, { format: markdownFormat })),
            base: Y.encodeStateAsUpdate(ydoc),
            strategy,
          }),
        );
      const doc = () =>
        yXmlFragmentToProseMirrorRootNode(fragment, editor.pmSchema);
      return { kept, moved, write, doc };
    }

    it("keeps the comments of the document when the text changes another block", () => {
      const { kept, moved, write, doc } = setupWithComments();
      write((text) => replaceOnce(text, "End", "The end"));

      expect(commentedText(doc(), kept)).toBe("Apples");
      expect(commentedText(doc(), moved)).toBe("Pears");
    });

    it("keeps the comment of a block that the text moves", () => {
      const { moved, write, doc } = setupWithComments();
      write((text) => replaceOnce(text, "  * Pears", "* Pears"));

      expect(commentedText(doc(), moved)).toBe("Pears");
    });
  },
);

describe("an editor with a schema that does not fit the Y.Doc", () => {
  it("gives an error, and does not change the Y.Doc", () => {
    const withComments = createCommentEditor([
      { id: "p", type: "paragraph", content: "Alpha text" },
    ]);
    addComment(withComments, "Alpha");
    const ydoc = new Y.Doc();
    updateYFragment(
      ydoc,
      ydoc.getXmlFragment("prosemirror"),
      withComments.prosemirrorState.doc,
      { mapping: new Map(), isOMark: new Map() },
    );
    const before = Y.encodeStateAsUpdate(ydoc);
    // This editor does not have the comments extension.
    const editor = BlockNoteEditor.create();

    expect(() => getYDocText(editor, ydoc, { format: markdownFormat })).toThrow(
      /cannot read all content/,
    );
    expect(() =>
      valid(
        updateYDocFromText(editor, ydoc, {
          format: markdownFormat,
          text: "Alpha text, edited",
        }),
      ),
    ).toThrow(/cannot read all content/);
    expect(Y.encodeStateAsUpdate(ydoc)).toEqual(before);
  });
});

/**
 * The Y.Doc API writes each step to the Y element of its block (see
 * `writeSteps`). The result must be the same document as a write to an
 * editor.
 */
describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
  { name: "HTML", format: htmlFormat },
])("Y.Doc and editor give the same document ($name)", ({ name, format }) => {
  const edits = [
    { kind: "paragraph", edit: randomEdit },
    // Edits of lines change the nesting, thus they move nested blocks.
    ...(name === "markdown" ? [{ kind: "line", edit: randomLineEdit }] : []),
  ];
  it.each(
    edits.flatMap(({ kind, edit }) =>
      Array.from({ length: 40 }, (_, i) => ({ kind, edit, seed: i + 1 })),
    ),
  )("$kind edits, seed $seed", ({ edit, seed }) => {
    const random = createRandom(seed);
    const editor = BlockNoteEditor.create({
      initialContent: randomDocument(random),
    });
    const ydoc = blocksToYDoc(editor, editor.document);
    let text = getDocumentText(editor, format);
    for (let i = 0; i <= random.int(3); i++) {
      text = edit(random, text);
    }

    valid(updateDocumentFromText(editor, { format, text }));
    valid(updateYDocFromText(BlockNoteEditor.create(), ydoc, { format, text }));

    expect(getYDocText(BlockNoteEditor.create(), ydoc, { format })).toBe(
      getDocumentText(editor, format),
    );
  });
});

describe("Y.Doc writes after a move of a nested block", () => {
  const nested: PartialBlock[] = [
    {
      id: "p",
      type: "bulletListItem",
      content: "p",
      children: [{ id: "p1", type: "bulletListItem", content: "p1" }],
    },
    {
      id: "q",
      type: "bulletListItem",
      content: "q",
      children: [
        {
          id: "x",
          type: "bulletListItem",
          content: "x",
          children: [{ id: "z", type: "bulletListItem", content: "z" }],
        },
      ],
    },
    {
      id: "r",
      type: "bulletListItem",
      content: "r",
      children: [{ id: "r1", type: "bulletListItem", content: "r1" }],
    },
  ];

  /** The block IDs of the Y.Doc and of an editor after the same write. */
  function write(text: string) {
    const editor = BlockNoteEditor.create();
    const ydoc = blocksToYDoc(
      editor,
      BlockNoteEditor.create({ initialContent: nested }).document,
    );
    valid(updateYDocFromText(editor, ydoc, { format: markdownFormat, text }));
    const reference = BlockNoteEditor.create({ initialContent: nested });
    valid(updateDocumentFromText(reference, { format: markdownFormat, text }));
    function ids(blocks: { id: string; children: any[] }[]): string[] {
      return blocks.flatMap((block) => [block.id, ...ids(block.children)]);
    }
    return {
      ydoc: ids(yDocToBlocks(editor, ydoc)),
      editor: ids(reference.document),
    };
  }

  it("removes a child of a block that the text moved into another parent", () => {
    const { ydoc, editor } = write("* p\n  * p1\n  * x\n* q\n* r\n  * r1\n");
    expect(editor).toEqual(["p", "p1", "x", "q", "r", "r1"]);
    expect(ydoc).toEqual(editor);
  });

  it("moves a block out of a moved block one time", () => {
    const { ydoc, editor } = write(
      "* p\n  * p1\n  * x\n* q\n* r\n  * r1\n  * z\n",
    );
    expect(editor).toEqual(["p", "p1", "x", "q", "r", "r1", "z"]);
    expect(ydoc).toEqual(editor);
  });
});

describe.each<MergeStrategy>(["rebase", "yjs"])(
  "concurrent writes with columns (strategy %s)",
  (strategy) => {
    it("keeps a block that another writer added to a column, when the text empties the other column", () => {
      const editor = BlockNoteEditor.create({
        schema: withMultiColumn(
          BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
        ),
      });
      const ydoc = blocksToYDoc(
        editor,
        BlockNoteEditor.create({
          schema: editor.schema,
          initialContent: [
            {
              id: "list",
              type: "columnList",
              children: [
                {
                  id: "cA",
                  type: "column",
                  children: [{ id: "a", type: "paragraph", content: "Alpha" }],
                },
                {
                  id: "cB",
                  type: "column",
                  children: [{ id: "b", type: "paragraph", content: "Bravo" }],
                },
              ],
            },
            { id: "end", type: "paragraph", content: "End" },
          ] as PartialBlock<any, any, any>[],
        }).document,
      );
      const format = markdownFormat;
      const text = getYDocText(editor, ydoc, { format });
      const base = Y.encodeStateAsUpdate(ydoc);
      // Another writer adds a block after Alpha, in column A.
      valid(
        updateYDocFromText(editor, ydoc, {
          format,
          text: text.replace("Alpha", "Alpha\n\nAdded by other"),
        }),
      );

      valid(
        updateYDocFromText(editor, ydoc, {
          format,
          text: text.replace("Bravo\n\n", ""),
          base,
          strategy,
        }),
      );

      expect(getYDocText(editor, ydoc, { format })).toContain("Added by other");
      expect(getYDocText(editor, ydoc, { format })).not.toContain("Bravo");
    });
  },
);
