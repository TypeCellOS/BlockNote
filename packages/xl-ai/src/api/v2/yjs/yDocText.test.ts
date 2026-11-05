import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import {
  blocksToYDoc,
  ForkYDocExtension,
  withCollaboration,
  yDocToBlocks,
} from "@blocknote/core/yjs";
import { Plugin } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import {
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "../index.js";
import {
  addComment,
  commentedText,
  commentEditorOptions,
} from "../testUtil/comments.js";
import {
  columnSchema,
  documentShape,
  fruitDocument,
  replaceOnce,
  richDocument,
} from "../testUtil/fixtures.js";
import { bindEditor, readText } from "../testUtil/yjs.js";
import { updateYDocFromText } from "./yDocText.js";
import { valid } from "../testUtil/valid.js";
import { formatCases } from "../testUtil/codecs.js";
import {
  createRandom,
  type Random,
  randomDocument,
  randomEdit,
  randomEdits,
  randomLineEdit,
} from "../testUtil/random.js";

/** An editor that gives the schema to read the Y.Doc directly, without a binding. */
const reader = BlockNoteEditor.create();

/** What merges a write from an older version (see `YDocWriteFromVersion`). */
const merges = ["lens", "yjs"] as const;
type Merge = (typeof merges)[number];

function setup(initialContent: PartialBlock[] = richDocument) {
  const ydoc = blocksToYDoc(
    reader,
    BlockNoteEditor.create({ initialContent }).document,
  );
  const fragment = ydoc.getXmlFragment("prosemirror");
  const editor = bindEditor(fragment);
  const format = markdownFormat;
  const blocks = () => yDocToBlocks(reader, ydoc);

  return {
    editor,
    ydoc,
    blocks,
    block: (id: string) => blocks().find((candidate) => candidate.id === id),
    /** A client reads the text. It keeps the Yjs state as the base of a later write. */
    read: () => ({
      text: getDocumentText(editor, format),
      base: Y.encodeStateAsUpdate(ydoc),
    }),
    /** A client writes back a changed copy of the text that it read. */
    write: (
      client: { text: string; base: Uint8Array },
      edit: (text: string) => string,
      merge?: Merge,
    ) =>
      valid(
        updateYDocFromText(editor, fragment, {
          format,
          text: edit(client.text),
          base: client.base,
          merge,
        }),
      ),
    /** Another user changes the document in an editor. */
    change: (edit: (editor: BlockNoteEditor<any, any, any>) => void) => {
      const user = bindEditor(fragment);
      edit(user);
      user._tiptapEditor.destroy();
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

  it("writes a URL of a plain text as text, not as a link", () => {
    const { editor, ydoc, block } = setup([
      { id: "p", type: "paragraph", content: "Alpha end" },
    ]);
    const fragment = ydoc.getXmlFragment("prosemirror");
    const text = "Alpha https://example.com end";

    valid(
      updateYDocFromText(editor, fragment, { format: plainTextFormat, text }),
    );

    expect(block("p")?.content).toEqual([{ type: "text", text, styles: {} }]);
  });

  it("throws an error if the editor is not bound to the Y.Doc, or not mounted", () => {
    const ydoc = new Y.Doc();
    const fragment = ydoc.getXmlFragment("prosemirror");
    const options = { format: markdownFormat, text: "Hello" };

    expect(() =>
      updateYDocFromText(BlockNoteEditor.create(), fragment, options),
    ).toThrow(/bound to the fragment/);
    const notMounted = BlockNoteEditor.create(
      withCollaboration({
        collaboration: { fragment, user: { name: "Lens", color: "#000000" } },
      }),
    );
    expect(() => updateYDocFromText(notMounted, fragment, options)).toThrow(
      /mounted/,
    );
  });

  it("allows merge yjs only with base, and without onConflict", () => {
    type Options = Parameters<typeof updateYDocFromText>[2];
    const yjs = { format: markdownFormat, text: "", merge: "yjs" } as const;
    const base = new Uint8Array();
    // @ts-expect-error `merge: "yjs"` needs `base`.
    const withoutBase: Options = yjs;
    // @ts-expect-error Yjs merges without conflicts, thus no `onConflict`.
    const withConflict: Options = { ...yjs, base, onConflict: "reject" };
    const withBase: Options = { ...yjs, base };

    expect([withoutBase, withConflict, withBase]).toHaveLength(3);
  });

  it("changes nothing if the text did not change", () => {
    const { ydoc, read, write } = setup();
    const before = Y.encodeStateVector(ydoc);

    write(read(), (text) => text);

    expect(Y.encodeStateVector(ydoc)).toEqual(before);
  });

  it("returns the Yjs update for the other clients", () => {
    const { ydoc, read, write, blocks } = setup();
    const replica = new Y.Doc();
    Y.applyUpdate(replica, Y.encodeStateAsUpdate(ydoc));

    const result = write(read(), (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
    );
    Y.applyUpdate(replica, result.update);

    expect(yDocToBlocks(reader, replica)).toEqual(blocks());
  });
});

describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
])("empty and cleared documents ($name)", ({ format }) => {
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
    const fragment = ydoc.getXmlFragment("prosemirror");
    valid(
      updateYDocFromText(bindEditor(fragment), fragment, {
        format,
        text: "Hello",
      }),
    );

    expect(readText(fragment, format).trim()).toBe("Hello");
    expect(idsOf(ydoc).every((id) => typeof id === "string")).toBe(true);
  });

  it("writes text with a base from an empty Y.Doc", () => {
    const ydoc = new Y.Doc();
    const fragment = ydoc.getXmlFragment("prosemirror");
    valid(
      updateYDocFromText(bindEditor(fragment), fragment, {
        format,
        text: "Hello",
        base: Y.encodeStateAsUpdate(ydoc),
      }),
    );

    expect(readText(fragment, format).trim()).toBe("Hello");
  });

  it.each(merges)(
    "keeps the text of another writer, if the base is an empty Y.Doc (merge %s)",
    (merge) => {
      const ydoc = new Y.Doc();
      const fragment = ydoc.getXmlFragment("prosemirror");
      const base = Y.encodeStateAsUpdate(ydoc);
      valid(
        updateYDocFromText(bindEditor(fragment), fragment, {
          format,
          text: "Other",
        }),
      );
      valid(
        updateYDocFromText(bindEditor(fragment), fragment, {
          format,
          text: "Hello",
          base,
          merge,
        }),
      );

      expect(readText(fragment, format).trim()).toBe("Hello\n\nOther");
      expect(fragment.length).toBe(1);
    },
  );

  it("clears a document, and writes text again", () => {
    const ydoc = blocksToYDoc(
      reader,
      BlockNoteEditor.create({
        initialContent: [{ type: "paragraph", content: "Old text" }],
      }).document,
    );
    const fragment = ydoc.getXmlFragment("prosemirror");
    const editor = bindEditor(fragment);
    valid(updateYDocFromText(editor, fragment, { format, text: "" }));
    valid(updateYDocFromText(editor, fragment, { format, text: "New text" }));

    expect(readText(fragment, format).trim()).toBe("New text");
    expect(idsOf(ydoc).every((id) => typeof id === "string")).toBe(true);
  });
});

describe.each(merges)("concurrent writes (merge %s)", (merge) => {
  /**
   * A test that fails with `merge: "yjs"`: in y-prosemirror v13, a move is a
   * removal and an insert. A Yjs binding with a block tree (parent links)
   * can make these tests pass.
   */
  const itMoves = merge === "yjs" ? it.fails : it;

  // Some tests are only for `merge: "yjs"`. With `"lens"`, the merge of the
  // lens does the work, as without Yjs, and `api.concurrent.test.ts` has the
  // same cases.
  if (merge === "yjs") {
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
        merge,
      );

      expect(block("colored")?.content).toMatchObject([
        { text: "Colored by A" },
      ]);
      expect(block("last")?.content).toMatchObject([
        { text: "Last paragraph from B" },
      ]);
    });
  }

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
      merge,
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
      merge,
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
      merge,
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
      merge,
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
      merge,
    );

    expect(blocks().filter((candidate) => candidate.id === "last")).toEqual([
      block("last"),
    ]);
    expect(blocks()[0]).toMatchObject({
      id: "last",
      content: [{ text: "Last paragraph, edited" }],
    });
  });

  // Only for `merge: "yjs"` (see above).
  if (merge === "yjs") {
    itMoves("does one move if two writers make the same move", () => {
      const { read, write, blocks } = setup(fruitDocument);
      const a = read();
      const b = read();

      write(a, (text) => replaceOnce(text, "  * Pears", "* Pears"));
      write(b, (text) => replaceOnce(text, "  * Pears", "* Pears"), merge);

      expect(documentShape(blocks())).toEqual([
        "fruit",
        ["apples"],
        "pears",
        "end",
      ]);
    });

    itMoves("keeps a change to a block that another writer moved", () => {
      const { read, write, block, blocks } = setup(fruitDocument);
      const a = read();
      const b = read();

      write(a, (text) => replaceOnce(text, "  * Pears", "* Pears"));
      write(b, (text) => replaceOnce(text, "Pears", "Pears and plums"), merge);

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
  }

  itMoves(
    "keeps a change of another writer to a block that the text moves",
    () => {
      const { read, write, block, blocks } = setup(fruitDocument);
      const a = read();
      const b = read();

      write(a, (text) => replaceOnce(text, "Pears", "Pears and plums"));
      write(b, (text) => replaceOnce(text, "  * Pears", "* Pears"), merge);

      expect(documentShape(blocks())).toEqual([
        "fruit",
        ["apples"],
        "pears",
        "end",
      ]);
      expect(block("pears")?.content).toMatchObject([
        { text: "Pears and plums" },
      ]);
    },
  );
});

/** The conflicts of the lens merge. Yjs merges without conflicts. */
describe("concurrent writes (merge lens): conflicts", () => {
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

  it("keeps a block that the client removes and another writer changed, with a warning", () => {
    const { read, write, change, block } = setup();
    const client = read();

    change((editor) =>
      editor.updateBlock("last", { props: { textColor: "green" } }),
    );
    const result = write(client, (text) =>
      replaceOnce(text, "\n\nLast paragraph", ""),
    );

    expect(block("last")).toMatchObject({ props: { textColor: "green" } });
    expect(result.warnings).toEqual([
      { type: "removed-changed-block", id: "last" },
    ]);
  });

  it("does not change the Y.Doc, with onConflict reject, if there is a conflict", () => {
    const { editor, ydoc, read, change } = setup();
    const client = read();
    change((user) => user.updateBlock("last", { content: "Last section" }));
    const before = Y.encodeStateAsUpdate(ydoc);

    const result = updateYDocFromText(
      editor,
      ydoc.getXmlFragment("prosemirror"),
      {
        format: markdownFormat,
        text: replaceOnce(
          replaceOnce(client.text, "Last paragraph", "Last part"),
          "Colored centered paragraph",
          "Colored text",
        ),
        base: client.base,
        onConflict: "reject",
      },
    );

    expect(result).toEqual({
      error: "conflict",
      conflicts: [{ type: "conflicting-change", id: "last" }],
    });
    expect(Y.encodeStateAsUpdate(ydoc)).toEqual(before);
  });
});

describe.each(merges)("comments (merge %s)", (merge) => {
  /** A Y.Doc with comments, from a client with the comments extension. */
  function setupWithComments() {
    const ydoc = new Y.Doc();
    const fragment = ydoc.getXmlFragment("prosemirror");
    const editor = bindEditor(fragment, commentEditorOptions());
    editor.replaceBlocks(editor.document, fruitDocument);
    const kept = addComment(editor, "Apples");
    const moved = addComment(editor, "Pears");
    const write = (edit: (text: string) => string) =>
      valid(
        updateYDocFromText(editor, fragment, {
          format: markdownFormat,
          text: edit(getDocumentText(editor, markdownFormat)),
          base: Y.encodeStateAsUpdate(ydoc),
          merge,
        }),
      );
    /** The document of the Y.Doc, as a new client with comments reads it. */
    const doc = () =>
      bindEditor(fragment, commentEditorOptions()).prosemirrorState.doc;
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
});

/**
 * HTML seeds of the paragraph edits that fail because of a known problem of
 * core: the autolink plugin adds links to a change from Yjs. In seed 22, the
 * Y.Doc write gives a link "https://block.delta" that the text does not
 * have. The fix is a separate core change ("autolink does not add links to a
 * change from Yjs"). When core has it, add these seeds again.
 */
const HTML_AUTOLINK_SEEDS = [22];

/**
 * The Y.Doc API writes through the binding of an editor, in transactions
 * with one change for each text block (see `dispatchSteps`). The result must
 * be the same document as a write to an editor without Yjs.
 */
describe.each(formatCases)(
  "Y.Doc and editor give the same document ($name)",
  ({ name, format, codec }) => {
    const edits = [
      {
        kind: "paragraph",
        edit: (random: Random, text: string) => randomEdit(random, text, codec),
      },
      // Edits of lines change the nesting, thus they move nested blocks.
      ...(name === "markdown" ? [{ kind: "line", edit: randomLineEdit }] : []),
    ];
    function isKnown(kind: string, seed: number) {
      return (
        name === "HTML" &&
        kind === "paragraph" &&
        HTML_AUTOLINK_SEEDS.includes(seed)
      );
    }
    it.each(
      edits.flatMap(({ kind, edit }) =>
        Array.from({ length: 40 }, (_, i) => ({
          kind,
          edit,
          seed: i + 1,
        })).filter(({ seed }) => !isKnown(kind, seed)),
      ),
    )("$kind edits, seed $seed", ({ edit, seed }) => {
      const random = createRandom(seed);
      const editor = BlockNoteEditor.create({
        initialContent: randomDocument(random),
      });
      const fragment = blocksToYDoc(editor, editor.document).getXmlFragment(
        "prosemirror",
      );
      const text = randomEdits(random, getDocumentText(editor, format), edit);

      valid(updateDocumentFromText(editor, { format, text }));
      valid(
        updateYDocFromText(bindEditor(fragment), fragment, { format, text }),
      );

      expect(readText(fragment, format)).toBe(getDocumentText(editor, format));
    });
  },
);

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
    const ydoc = blocksToYDoc(
      reader,
      BlockNoteEditor.create({ initialContent: nested }).document,
    );
    const fragment = ydoc.getXmlFragment("prosemirror");
    valid(
      updateYDocFromText(bindEditor(fragment), fragment, {
        format: markdownFormat,
        text,
      }),
    );
    const reference = BlockNoteEditor.create({ initialContent: nested });
    valid(updateDocumentFromText(reference, { format: markdownFormat, text }));
    function ids(blocks: { id: string; children: any[] }[]): string[] {
      return blocks.flatMap((block) => [block.id, ...ids(block.children)]);
    }
    return {
      ydoc: ids(yDocToBlocks(reader, ydoc)),
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

describe.each(merges)("concurrent writes with columns (merge %s)", (merge) => {
  it("keeps a block that another writer added to a column, when the text empties the other column", () => {
    const schema = columnSchema;
    const ydoc = blocksToYDoc(
      BlockNoteEditor.create({ schema }),
      BlockNoteEditor.create({
        schema,
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
    const fragment = ydoc.getXmlFragment("prosemirror");
    const editor = bindEditor(fragment, { schema });
    const format = markdownFormat;
    const text = getDocumentText(editor, format);
    const base = Y.encodeStateAsUpdate(ydoc);
    // Another writer adds a block between Alpha and Bravo. Markdown does not
    // show the columns, thus the block goes into column B, before Bravo (a
    // new block goes into the nesting of the next block).
    valid(
      updateYDocFromText(bindEditor(fragment, { schema }), fragment, {
        format,
        text: text.replace("Alpha", "Alpha\n\nAdded by other"),
      }),
    );

    valid(
      updateYDocFromText(editor, fragment, {
        format,
        text: text.replace("Bravo\n\n", ""),
        base,
        merge,
      }),
    );

    const result = readText(fragment, format, { schema });
    expect(result).toContain("Added by other");
    expect(result).not.toContain("Bravo");
  });
});

describe("changes of other writers in a list with more than one structural change", () => {
  const blocks: PartialBlock[] = [
    { id: "a", type: "paragraph", content: "Alpha" },
    { id: "b", type: "paragraph", content: "Beta" },
    { id: "c", type: "paragraph", content: "Gamma" },
  ];

  it("keeps a change of another client that arrives after the write in its block", () => {
    const ydoc = blocksToYDoc(BlockNoteEditor.create(), blocks);
    const other = new Y.Doc();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(ydoc));
    // The other client changes Alpha. The lens does not have this change yet.
    bindEditor(other.getXmlFragment("prosemirror")).updateBlock("a", {
      content: "Alpha of the other client",
    });

    // The text adds a block at the start and at the end of the list.
    const fragment = ydoc.getXmlFragment("prosemirror");
    const editor = bindEditor(fragment);
    valid(
      updateYDocFromText(editor, fragment, {
        format: markdownFormat,
        text: "First\n\nAlpha\n\nBeta\n\nGamma\n\nLast\n",
      }),
    );
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(other));

    expect(getDocumentText(editor, markdownFormat)).toBe(
      "First\n\nAlpha of the other client\n\nBeta\n\nGamma\n\nLast\n",
    );
  });

  it("keeps a change of another client in its block, also with the API for an editor", () => {
    // updateDocumentFromText on an editor that is bound to a Y.Doc (for
    // example AI in a collaborative editor) uses the same transactions.
    const ydoc = blocksToYDoc(BlockNoteEditor.create(), blocks);
    const other = new Y.Doc();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(ydoc));
    bindEditor(other.getXmlFragment("prosemirror")).updateBlock("a", {
      content: "Alpha of the other client",
    });

    const fragment = ydoc.getXmlFragment("prosemirror");
    const editor = bindEditor(fragment);
    valid(
      updateDocumentFromText(editor, {
        format: markdownFormat,
        text: "First\n\nAlpha\n\nBeta\n\nGamma\n\nLast\n",
      }),
    );
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(other));

    expect(getDocumentText(editor, markdownFormat)).toBe(
      "First\n\nAlpha of the other client\n\nBeta\n\nGamma\n\nLast\n",
    );
  });

  it.each(merges)(
    "keeps a change of another writer in its block, with inserts at two places (merge %s)",
    (merge) => {
      const ydoc = blocksToYDoc(BlockNoteEditor.create(), blocks);
      const fragment = ydoc.getXmlFragment("prosemirror");
      const editor = bindEditor(fragment);
      const base = Y.encodeStateAsUpdate(ydoc);
      editor.updateBlock("a", { content: "Alpha edited" });

      valid(
        updateYDocFromText(editor, fragment, {
          format: markdownFormat,
          text: "First\n\nAlpha\n\nBeta\n\nGamma\n\nLast\n",
          base,
          merge,
        }),
      );
      expect(getDocumentText(editor, markdownFormat)).toBe(
        "First\n\nAlpha edited\n\nBeta\n\nGamma\n\nLast\n",
      );
    },
  );

  it.each(merges)(
    "keeps a change of another writer to a block that a move passes (merge %s)",
    (merge) => {
      const ydoc = blocksToYDoc(BlockNoteEditor.create(), blocks);
      const fragment = ydoc.getXmlFragment("prosemirror");
      const editor = bindEditor(fragment);
      const base = Y.encodeStateAsUpdate(ydoc);
      editor.updateBlock("b", { content: "Beta edited" });

      valid(
        updateYDocFromText(editor, fragment, {
          format: markdownFormat,
          text: "Gamma\n\nAlpha\n\nBeta\n",
          base,
          merge,
        }),
      );
      expect(getDocumentText(editor, markdownFormat)).toBe(
        "Gamma\n\nAlpha\n\nBeta edited\n",
      );
    },
  );
});

describe("a base with two blocks with one ID", () => {
  it("does not duplicate content, and gives a warning for the change that it cannot apply", () => {
    const ydoc = blocksToYDoc(BlockNoteEditor.create(), [
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "a", type: "paragraph", content: "Alpha copy" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const fragment = ydoc.getXmlFragment("prosemirror");
    // The editor gives the two blocks new IDs (UniqueID), but the Y.Doc and
    // thus the base keep the duplicate. The lens cannot find the copy.
    const editor = bindEditor(fragment);
    const base = Y.encodeStateAsUpdate(ydoc);
    const text = getDocumentText(editor, markdownFormat);
    editor.updateBlock("b", { content: "Beta 2" });

    const result = valid(
      updateYDocFromText(editor, fragment, {
        format: markdownFormat,
        text: replaceOnce(text, "Alpha copy", "Alpha copy edited"),
        base,
      }),
    );
    expect(getDocumentText(editor, markdownFormat)).toBe(
      "Alpha\n\nAlpha copy\n\nBeta 2\n",
    );
    expect(result.warnings).toEqual([
      { type: "change-to-removed-block", id: "a-2" },
    ]);
  });
});

describe("a write that fails in the middle", () => {
  it("does not change the Y.Doc", () => {
    const ydoc = blocksToYDoc(BlockNoteEditor.create(), [
      { id: "a", type: "paragraph", content: "x Alpha one two Omega end" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const fragment = ydoc.getXmlFragment("prosemirror");
    const editor = bindEditor(fragment);
    // The inline steps go from the end of the text to its start. A plugin
    // removes "x Alpha one" after the text gets "Last". The second step of
    // the write (which changes "Alpha") then cannot apply.
    editor._tiptapEditor.registerPlugin(
      new Plugin({
        appendTransaction(_transactions, _old, state) {
          let range: [number, number] | undefined;
          state.doc.descendants((node, pos) => {
            const text = node.isText ? (node.text ?? "") : "";
            if (text.includes("Last") && text.includes("Alpha")) {
              range = [pos, pos + "x Alpha one".length];
            }
          });
          return range === undefined ? null : state.tr.delete(...range);
        },
      }),
    );
    const before = readText(fragment, markdownFormat);

    expect(() =>
      updateYDocFromText(editor, fragment, {
        format: markdownFormat,
        text: "x First one two Last end\n\nBeta\n",
      }),
    ).toThrow();
    expect(readText(fragment, markdownFormat)).toBe(before);
  });
});

describe("a base with an update that the Y.Doc does not have yet", () => {
  it.each(merges)(
    "keeps the change of the client to the block of that update (merge %s)",
    (merge) => {
      const server = blocksToYDoc(BlockNoteEditor.create(), [
        { id: "a", type: "paragraph", content: "Alpha" },
        { id: "b", type: "paragraph", content: "Beta" },
      ]);
      const replica = new Y.Doc();
      Y.applyUpdate(replica, Y.encodeStateAsUpdate(server));
      // Another client adds a block on the replica. The server does not
      // have it yet.
      const before = Y.encodeStateVector(replica);
      bindEditor(replica.getXmlFragment("prosemirror")).insertBlocks(
        [{ type: "paragraph", content: "Gamma" }],
        "b",
        "after",
      );
      const inFlight = Y.encodeStateAsUpdate(replica, before);
      // The client reads from the replica.
      const text = readText(
        replica.getXmlFragment("prosemirror"),
        markdownFormat,
      );
      const base = Y.encodeStateAsUpdate(replica);

      const fragment = server.getXmlFragment("prosemirror");
      const result = valid(
        updateYDocFromText(bindEditor(fragment), fragment, {
          format: markdownFormat,
          text: replaceOnce(text, "Gamma", "Gamma edited"),
          base,
          merge,
        }),
      );
      Y.applyUpdate(server, inFlight);
      expect(result.warnings).toEqual([]);
      expect(readText(fragment, markdownFormat)).toBe(
        "Alpha\n\nBeta\n\nGamma edited\n",
      );
    },
  );
});

describe("an editor that shows a fork of the Y.Doc", () => {
  it("gives an error, and does not change the Y.Doc or the fork", () => {
    const ydoc = blocksToYDoc(BlockNoteEditor.create(), [
      { id: "a", type: "paragraph", content: "Alpha" },
    ]);
    const fragment = ydoc.getXmlFragment("prosemirror");
    const editor = bindEditor(fragment);
    const fork = editor.getExtension(ForkYDocExtension)!;
    fork.fork();
    const before = Y.encodeStateAsUpdate(ydoc);

    expect(() =>
      updateYDocFromText(editor, fragment, {
        format: markdownFormat,
        text: "Alpha edited\n",
      }),
    ).toThrow("fork");
    expect(fork.store.state.isForked).toBe(true);
    expect(Y.encodeStateAsUpdate(ydoc)).toEqual(before);
    fork.merge({ keepChanges: false });
  });
});
