import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { blocksToYDoc, yDocToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";
import { describe, expect, it } from "vite-plus/test";

import {
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  type TextChange,
  updateDocument,
} from "../index.js";
import {
  addComment,
  commentEditorOptions,
  commentedText,
} from "../testUtil/comments.js";
import {
  columnSchema,
  documentShape,
  fruitDocument,
  replaceOnce,
  richDocument,
} from "../testUtil/fixtures.js";
import {
  bindEditor,
  blockNodeIds,
  readText,
  unbindEditor,
} from "../testUtil/y.js";
import { getYDocText, updateYDoc } from "./yDocText.js";
import {
  experimental_updateYDocWithYjsMerge,
  updateYDocWithMerge,
} from "./yDocTextWithMerge.js";
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

/**
 * An editor without a view, which is not bound to a Y.Doc. It gives the
 * schema and the conversions for the writes and the reads of the Y.Doc.
 */
const reader = BlockNoteEditor.create();

/**
 * What merges a write from an older version: the lens
 * (`updateYDocWithMerge`) or Yjs (`experimental_updateYDocWithYjsMerge`).
 */
const merges = ["lens", "yjs"] as const;
type Merge = (typeof merges)[number];

/**
 * A merge write of a text from the version `base`. The lens merge keeps the
 * current document in a conflict (`keep-current`).
 */
function mergeWrite(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: TextChange & { base: Uint8Array },
  merge: Merge = "lens",
) {
  return merge === "yjs"
    ? experimental_updateYDocWithYjsMerge(editor, fragment, change)
    : updateYDocWithMerge(editor, fragment, {
        ...change,
        onConflict: "keep-current",
      });
}

function setup(initialContent: PartialBlock[] = richDocument) {
  const ydoc = blocksToYDoc(
    reader,
    BlockNoteEditor.create({ initialContent }).document,
  );
  const fragment = ydoc.get("prosemirror");
  const editor = reader;
  const format = markdownFormat;
  const blocks = () => yDocToBlocks(reader, ydoc);

  return {
    editor,
    ydoc,
    blocks,
    block: (id: string) => blocks().find((candidate) => candidate.id === id),
    /** A client reads the text. It keeps the Yjs state as the base of a later write. */
    read: () => ({
      text: getYDocText(editor, fragment, format),
      base: Y.encodeStateAsUpdate(ydoc),
    }),
    /** A client writes back a changed copy of the text that it read. */
    write: (
      client: { text: string; base: Uint8Array },
      edit: (text: string) => string,
      merge?: Merge,
    ) =>
      valid(
        mergeWrite(
          editor,
          fragment,
          { format, text: edit(client.text), base: client.base },
          merge,
        ),
      ),
    /** Another user changes the document, in an editor that is bound to the Y.Doc. */
    change: (edit: (editor: BlockNoteEditor<any, any, any>) => void) => {
      const user = bindEditor(fragment);
      edit(user);
      unbindEditor(user);
    },
  };
}

describe("updateYDoc", () => {
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
    const fragment = ydoc.get("prosemirror");
    const text = "Alpha https://example.com end";

    valid(
      updateYDoc(editor, fragment, {
        base: "current",
        format: plainTextFormat,
        text,
      }),
    );

    expect(block("p")?.content).toEqual([{ type: "text", text, styles: {} }]);
  });

  it.each([
    ["updateYDoc", updateYDoc],
    ["updateYDocWithMerge", updateYDocWithMerge],
    [
      "experimental_updateYDocWithYjsMerge",
      experimental_updateYDocWithYjsMerge,
    ],
  ] as const)(
    "%s throws an error for a write without `base`, and does not change the Y.Doc",
    (_, write) => {
      const { editor, ydoc, blocks } = setup();
      const before = blocks();
      const fragment = ydoc.get("prosemirror");

      // A caller without types can forget `base`.
      expect(() =>
        write(editor, fragment, {
          format: markdownFormat,
          text: "Hello",
        } as never),
      ).toThrow(/needs the option `base`/);
      expect(blocks()).toEqual(before);
    },
  );

  it("writes with an editor that is not bound to the Y.Doc, and that has no view", () => {
    const { ydoc, block } = setup();
    const fragment = ydoc.get("prosemirror");
    const editor = BlockNoteEditor.create();
    expect(editor.headless).toBe(true);

    valid(
      updateYDoc(editor, fragment, {
        base: "current",
        format: markdownFormat,
        text: replaceOnce(
          getYDocText(editor, fragment, markdownFormat),
          "Last paragraph",
          "Last paragraph, edited",
        ),
      }),
    );

    expect(block("last")?.content).toMatchObject([
      { text: "Last paragraph, edited" },
    ]);
  });

  it("shows the write in an editor that is bound to the Y.Doc", () => {
    const { ydoc, read, write, blocks } = setup();
    const live = bindEditor(ydoc.get("prosemirror"), { trailingBlock: false });

    write(read(), (text) =>
      replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
    );

    expect(live.getBlock("last")?.content).toMatchObject([
      { text: "Last paragraph, edited" },
    ]);
    expect(live.document).toEqual(blocks());
  });

  it("allows the Yjs merge only with a version as base, and without onConflict", () => {
    type Options = Parameters<typeof experimental_updateYDocWithYjsMerge>[2];
    const text = { format: markdownFormat, text: "" };
    const base = new Uint8Array();
    // @ts-expect-error The Yjs merge needs `base`.
    const withoutBase: Options = text;
    // @ts-expect-error The current document has nothing to merge.
    const withCurrent: Options = { ...text, base: "current" };
    // @ts-expect-error Yjs merges without conflicts, thus no `onConflict`.
    const withConflict: Options = { ...text, base, onConflict: "reject" };
    const withBase: Options = { ...text, base };

    expect([withoutBase, withCurrent, withConflict, withBase]).toHaveLength(4);
  });

  it("allows onConflict only on the lens merge, where it is required", () => {
    type Strict = Parameters<typeof updateYDoc>[2];
    type Merged = Parameters<typeof updateYDocWithMerge>[2];
    const text = { format: markdownFormat, text: "" };
    const base = new Uint8Array();
    // @ts-expect-error A strict write does not merge: it has no conflicts.
    const strictWithConflict: Strict = { ...text, base, onConflict: "reject" };
    // @ts-expect-error A merge write states what a conflict does.
    const mergeWithoutConflict: Merged = { ...text, base };
    const mergeWithCurrent: Merged = {
      ...text,
      // @ts-expect-error The current document has nothing to merge.
      base: "current",
      onConflict: "reject",
    };
    const merge: Merged = { ...text, base, onConflict: "reject" };

    expect([
      strictWithConflict,
      mergeWithoutConflict,
      mergeWithCurrent,
      merge,
    ]).toHaveLength(4);
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

/**
 * `updateYDoc` with a Yjs state as `base`: the write applies only if the
 * document of the fragment is still at that version.
 */
describe("a strict write from a version", () => {
  const threeParagraphs: PartialBlock[] = [
    { id: "a", type: "paragraph", content: "Alpha" },
    { id: "b", type: "paragraph", content: "Beta" },
    { id: "c", type: "paragraph", content: "Gamma" },
  ];

  it("gives the error document-changed, and does not change the Y.Doc, if another writer changed the document", () => {
    const { editor, ydoc, read, change } = setup(threeParagraphs);
    const client = read();
    change((user) => {
      user.updateBlock("b", { content: "Beta, changed" });
      user.removeBlocks(["c"]);
    });
    const before = Y.encodeStateAsUpdate(ydoc);

    const result = updateYDoc(editor, ydoc.get("prosemirror"), {
      format: markdownFormat,
      text: replaceOnce(client.text, "Alpha", "Alpha, from the client"),
      base: client.base,
    });

    expect(result).toEqual({
      error: "document-changed",
      changesOfOthers: expect.arrayContaining([
        { id: "b", change: "changed" },
        { id: "c", change: "removed" },
      ]),
    });
    expect(result).toHaveProperty("changesOfOthers.length", 2);
    expect(Y.encodeStateAsUpdate(ydoc)).toEqual(before);
  });

  it("gives the error for a change of only a prop that the format does not show", () => {
    const { editor, ydoc, read, change } = setup(threeParagraphs);
    const client = read();
    change((user) => user.updateBlock("b", { props: { textColor: "red" } }));

    expect(
      updateYDoc(editor, ydoc.get("prosemirror"), {
        format: markdownFormat,
        text: replaceOnce(client.text, "Alpha", "Alpha, from the client"),
        base: client.base,
      }),
    ).toEqual({
      error: "document-changed",
      changesOfOthers: [{ id: "b", change: "changed" }],
    });
  });

  it("applies the write as a write to the current document, if no other writer changed the document", () => {
    const { editor, ydoc, read, blocks } = setup(threeParagraphs);
    const client = read();
    const text = replaceOnce(client.text, "Alpha", "Alpha, from the client");
    const reference = setup(threeParagraphs);

    const result = valid(
      updateYDoc(editor, ydoc.get("prosemirror"), {
        format: markdownFormat,
        text,
        base: client.base,
      }),
    );
    const current = valid(
      updateYDoc(reference.editor, reference.ydoc.get("prosemirror"), {
        format: markdownFormat,
        text,
        base: "current",
      }),
    );

    // The result has no `changesOfOthers` and no `written`.
    expect(result).toEqual({
      operations: current.operations,
      warnings: [],
      update: expect.any(Uint8Array),
    });
    expect(result.operations).toMatchObject([{ type: "update", id: "a" }]);
    expect(blocks()).toEqual(reference.blocks());
  });

  it("does not take a change in a different part of the Y.Doc for a change of the document", () => {
    // A compare of state vectors would reject this write.
    const { editor, ydoc, read, block } = setup(threeParagraphs);
    const client = read();
    ydoc.get("settings").setAttr("title", "A new title");

    valid(
      updateYDoc(editor, ydoc.get("prosemirror"), {
        format: markdownFormat,
        text: replaceOnce(client.text, "Alpha", "Alpha, from the client"),
        base: client.base,
      }),
    );

    expect(block("a")?.content).toMatchObject([
      { text: "Alpha, from the client" },
    ]);
  });

  it("applies a write from a replica with an update that this Y.Doc does not have yet", () => {
    const server = blocksToYDoc(BlockNoteEditor.create(), [
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const replica = new Y.Doc();
    Y.applyUpdate(replica, Y.encodeStateAsUpdate(server));
    // Another client adds a block on the replica. The server does not have
    // it yet.
    const before = Y.encodeStateVector(replica);
    bindEditor(replica.get("prosemirror")).insertBlocks(
      [{ type: "paragraph", content: "Gamma" }],
      "b",
      "after",
    );
    const inFlight = Y.encodeStateAsUpdate(replica, before);
    // The client reads from the replica.
    const text = readText(replica.get("prosemirror"), markdownFormat);
    const base = Y.encodeStateAsUpdate(replica);

    const fragment = server.get("prosemirror");
    const result = valid(
      updateYDoc(reader, fragment, {
        format: markdownFormat,
        text: replaceOnce(text, "Gamma", "Gamma edited"),
        base,
      }),
    );
    Y.applyUpdate(server, inFlight);

    expect(result.warnings).toEqual([]);
    expect(readText(fragment, markdownFormat)).toBe(
      "Alpha\n\nBeta\n\nGamma edited\n",
    );
  });

  it("gives the error for a version without content, if the document has content now", () => {
    const ydoc = new Y.Doc();
    const fragment = ydoc.get("prosemirror");
    const base = Y.encodeStateAsUpdate(ydoc);
    valid(
      updateYDoc(reader, fragment, {
        base: "current",
        format: markdownFormat,
        text: "Other",
      }),
    );

    const result = updateYDoc(reader, fragment, {
      format: markdownFormat,
      text: "Hello",
      base,
    });

    expect(result).toMatchObject({
      error: "document-changed",
      changesOfOthers: [{ change: "added" }],
    });
    expect(readText(fragment, markdownFormat).trim()).toBe("Other");
  });
});

describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
])("empty and cleared documents ($name)", ({ format }) => {
  /** The IDs of all block nodes in the Y.Doc. */
  function idsOf(ydoc: Y.Doc): unknown[] {
    return blockNodeIds(ydoc.get("prosemirror"));
  }

  it("writes text to an empty Y.Doc", () => {
    const ydoc = new Y.Doc();
    const fragment = ydoc.get("prosemirror");
    valid(
      updateYDoc(reader, fragment, {
        base: "current",
        format,
        text: "Hello",
      }),
    );

    expect(readText(fragment, format).trim()).toBe("Hello");
    expect(idsOf(ydoc).every((id) => typeof id === "string")).toBe(true);
  });

  it("writes text with a base from an empty Y.Doc", () => {
    const ydoc = new Y.Doc();
    const fragment = ydoc.get("prosemirror");
    valid(
      mergeWrite(reader, fragment, {
        format,
        text: "Hello",
        base: Y.encodeStateAsUpdate(ydoc),
      }),
    );

    expect(readText(fragment, format).trim()).toBe("Hello");
  });

  it("writes text with a strict write, with a base from an empty Y.Doc", () => {
    // A base without content and a Y.Doc without content are the same
    // empty document: the write applies.
    const ydoc = new Y.Doc();
    const fragment = ydoc.get("prosemirror");
    valid(
      updateYDoc(reader, fragment, {
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
      const fragment = ydoc.get("prosemirror");
      const base = Y.encodeStateAsUpdate(ydoc);
      valid(
        updateYDoc(reader, fragment, {
          base: "current",
          format,
          text: "Other",
        }),
      );
      valid(
        mergeWrite(reader, fragment, { format, text: "Hello", base }, merge),
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
    const fragment = ydoc.get("prosemirror");
    const editor = reader;
    valid(
      updateYDoc(editor, fragment, {
        base: "current",
        format,
        text: "",
      }),
    );
    valid(
      updateYDoc(editor, fragment, {
        base: "current",
        format,
        text: "New text",
      }),
    );

    expect(readText(fragment, format).trim()).toBe("New text");
    expect(idsOf(ydoc).every((id) => typeof id === "string")).toBe(true);
  });
});

describe.each(merges)("concurrent writes (merge %s)", (merge) => {
  /**
   * A test that fails with the Yjs merge: in a Y.Doc (also with Yjs 14), a
   * move is a removal and an insert. A Yjs binding that keeps a link from each
   * block to its parent can make these tests pass.
   */
  const itMoves = merge === "yjs" ? it.fails : it;

  // Some tests are only for the Yjs merge. `updateYDocWithMerge` uses the
  // merge of the lens, as without Yjs, and `api.concurrent.test.ts` has the
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

  // Only for the Yjs merge (see above).
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

    const result = updateYDocWithMerge(editor, ydoc.get("prosemirror"), {
      format: markdownFormat,
      text: replaceOnce(
        replaceOnce(client.text, "Last paragraph", "Last part"),
        "Colored centered paragraph",
        "Colored text",
      ),
      base: client.base,
      onConflict: "reject",
    });

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
    const fragment = ydoc.get("prosemirror");
    const editor = bindEditor(fragment, commentEditorOptions());
    editor.replaceBlocks(editor.document, fruitDocument);
    const kept = addComment(editor, "Apples");
    const moved = addComment(editor, "Pears");
    // The lens writes with an editor that is not bound to the Y.Doc. It has
    // the schema of the clients, with the comment mark.
    const lens = BlockNoteEditor.create(commentEditorOptions());
    const write = (edit: (text: string) => string) =>
      valid(
        mergeWrite(
          lens,
          fragment,
          {
            format: markdownFormat,
            text: edit(getYDocText(lens, fragment, markdownFormat)),
            base: Y.encodeStateAsUpdate(ydoc),
          },
          merge,
        ),
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
      const fragment = blocksToYDoc(editor, editor.document).get("prosemirror");
      const text = randomEdits(random, getDocumentText(editor, format), edit);

      valid(updateDocument(editor, { base: "current", format, text }));
      valid(
        updateYDoc(reader, fragment, {
          base: "current",
          format,
          text,
        }),
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
    const fragment = ydoc.get("prosemirror");
    valid(
      updateYDoc(reader, fragment, {
        base: "current",
        format: markdownFormat,
        text,
      }),
    );
    const reference = BlockNoteEditor.create({ initialContent: nested });
    valid(
      updateDocument(reference, {
        base: "current",
        format: markdownFormat,
        text,
      }),
    );
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
    const fragment = ydoc.get("prosemirror");
    const editor = BlockNoteEditor.create({ schema });
    const format = markdownFormat;
    const text = getYDocText(editor, fragment, format);
    const base = Y.encodeStateAsUpdate(ydoc);
    // Another writer adds a block between Alpha and Bravo. Markdown does not
    // show the columns, thus the block goes into column B, before Bravo (a
    // new block goes into the nesting of the next block).
    valid(
      updateYDoc(editor, fragment, {
        base: "current",
        format,
        text: text.replace("Alpha", "Alpha\n\nAdded by other"),
      }),
    );

    valid(
      mergeWrite(
        editor,
        fragment,
        { format, text: text.replace("Bravo\n\n", ""), base },
        merge,
      ),
    );

    // With the Yjs merge, column B stays (`keepLayout`). The write empties
    // it, thus it gets the fill of the schema: an empty paragraph, which
    // markdown shows as `<br>`. The fill and the block of the other writer
    // are two inserts at one position, and the client IDs select their order.
    expect(readText(fragment, format, { schema })).toBeOneOf(
      merge === "lens"
        ? ["Alpha\n\nAdded by other\n\nEnd\n"]
        : [
            "Alpha\n\n<br>\n\nAdded by other\n\nEnd\n",
            "Alpha\n\nAdded by other\n\n<br>\n\nEnd\n",
          ],
    );
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
    bindEditor(other.get("prosemirror")).updateBlock("a", {
      content: "Alpha of the other client",
    });

    // The text adds a block at the start and at the end of the list.
    const fragment = ydoc.get("prosemirror");
    const editor = bindEditor(fragment);
    valid(
      updateYDoc(editor, fragment, {
        base: "current",
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
    // updateDocument on an editor that is bound to a Y.Doc (for
    // example AI in a collaborative editor) uses the same transactions.
    const ydoc = blocksToYDoc(BlockNoteEditor.create(), blocks);
    const other = new Y.Doc();
    Y.applyUpdate(other, Y.encodeStateAsUpdate(ydoc));
    bindEditor(other.get("prosemirror")).updateBlock("a", {
      content: "Alpha of the other client",
    });

    const fragment = ydoc.get("prosemirror");
    const editor = bindEditor(fragment);
    valid(
      updateDocument(editor, {
        base: "current",
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
      const fragment = ydoc.get("prosemirror");
      const editor = bindEditor(fragment);
      const base = Y.encodeStateAsUpdate(ydoc);
      editor.updateBlock("a", { content: "Alpha edited" });

      valid(
        mergeWrite(
          editor,
          fragment,
          {
            format: markdownFormat,
            text: "First\n\nAlpha\n\nBeta\n\nGamma\n\nLast\n",
            base,
          },
          merge,
        ),
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
      const fragment = ydoc.get("prosemirror");
      const editor = bindEditor(fragment);
      const base = Y.encodeStateAsUpdate(ydoc);
      editor.updateBlock("b", { content: "Beta edited" });

      valid(
        mergeWrite(
          editor,
          fragment,
          {
            format: markdownFormat,
            text: "Gamma\n\nAlpha\n\nBeta\n",
            base,
          },
          merge,
        ),
      );
      expect(getDocumentText(editor, markdownFormat)).toBe(
        "Gamma\n\nAlpha\n\nBeta edited\n",
      );
    },
  );
});

// REVISIT: a Y.Doc can have two blocks with one ID, after two writers moved
// the same block (a move is a removal and an insert in a Y.Doc). The lens
// pairs blocks by ID, thus such a document is a broken invariant: the write
// throws, and the Y.Doc does not change. Then the lens cannot write that
// document until a client fixes the IDs in the Y.Doc. An earlier version gave
// the later block the ID with a number (`a-2`) and wrote the change (see
// `assertBlockIds`).
describe("a Y.Doc with two blocks with one ID", () => {
  it("throws, and the Y.Doc does not change", () => {
    const ydoc = blocksToYDoc(BlockNoteEditor.create(), [
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "a", type: "paragraph", content: "Alpha copy" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const fragment = ydoc.get("prosemirror");
    const base = Y.encodeStateAsUpdate(ydoc);
    const text = getYDocText(reader, fragment, markdownFormat);
    const change = {
      format: markdownFormat,
      text: replaceOnce(text, "Alpha copy", "Alpha copy edited"),
    };

    expect(() =>
      updateYDoc(reader, fragment, { ...change, base: "current" }),
    ).toThrow("Two blocks of the current document have the ID a");
    expect(() => mergeWrite(reader, fragment, { ...change, base })).toThrow(
      "Two blocks of the current document have the ID a",
    );
    expect(Y.encodeStateAsUpdate(ydoc)).toEqual(base);
  });
});

describe("a write that fails", () => {
  it("throws, and does not change the Y.Doc, if the schema of the editor cannot read the Y.Doc", () => {
    // The Y.Doc has a column list. The editor of the write has the default
    // schema, without columns. Thus, its document does not have the column
    // list, and a change after it would go to a wrong position.
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
    const fragment = ydoc.get("prosemirror");
    const before = Y.encodeStateAsUpdate(ydoc);

    expect(() =>
      updateYDoc(reader, fragment, {
        base: "current",
        format: markdownFormat,
        text: "End, edited\n",
      }),
    ).toThrow();
    expect(Y.encodeStateAsUpdate(ydoc)).toEqual(before);
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
      bindEditor(replica.get("prosemirror")).insertBlocks(
        [{ type: "paragraph", content: "Gamma" }],
        "b",
        "after",
      );
      const inFlight = Y.encodeStateAsUpdate(replica, before);
      // The client reads from the replica.
      const text = readText(replica.get("prosemirror"), markdownFormat);
      const base = Y.encodeStateAsUpdate(replica);

      const fragment = server.get("prosemirror");
      const result = valid(
        mergeWrite(
          reader,
          fragment,
          {
            format: markdownFormat,
            text: replaceOnce(text, "Gamma", "Gamma edited"),
            base,
          },
          merge,
        ),
      );
      Y.applyUpdate(server, inFlight);
      expect(result.warnings).toEqual([]);
      expect(readText(fragment, markdownFormat)).toBe(
        "Alpha\n\nBeta\n\nGamma edited\n",
      );
    },
  );
});

describe.each(merges)(
  "the changes of other writers in the result (merge %s)",
  (merge) => {
    it("names the blocks that other writers changed after base", () => {
      const { read, write, change } = setup([
        { id: "a", type: "paragraph", content: "Alpha" },
        { id: "b", type: "paragraph", content: "Beta" },
        { id: "c", type: "paragraph", content: "Gamma" },
      ]);
      const client = read();
      change((user) => {
        user.updateBlock("b", { content: "Beta, changed" });
        user.removeBlocks(["c"]);
      });

      const { changesOfOthers } = write(
        client,
        (text) => replaceOnce(text, "Alpha", "Alpha, from the client"),
        merge,
      );

      expect(changesOfOthers).toHaveLength(2);
      expect(changesOfOthers).toEqual(
        expect.arrayContaining([
          { id: "b", change: "changed" },
          { id: "c", change: "removed" },
        ]),
      );
    });
  },
);
