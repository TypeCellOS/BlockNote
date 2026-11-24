import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import {
  blockNoteTransformer,
  blocksToYDoc,
  yDocToBlocks,
} from "@blocknote/core/y";
import { pmnodeToDelta } from "@y/prosemirror";
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
  typeAfter,
  unbindEditor,
} from "../testUtil/y.js";
import {
  applyYDocOperations,
  computeYDocOperations,
  getYDocText,
  updateYDoc,
  yDocChangesAfterBase,
} from "./yjsApi.js";
import {
  computeYDocOperationsWithMerge,
  experimental_updateYDocWithYjsMerge,
  updateYDocWithMerge,
} from "./yjsApiWithMerge.js";
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
      base: Y.encodeStateAsUpdateV2(ydoc),
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
        format: plainTextFormat,
        text,
      }),
    );

    expect(block("p")?.content).toEqual([{ type: "text", text, styles: {} }]);
  });

  it.each([
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

  it("writes to the content as it is, not as a renderer of the fragment shows it", () => {
    const ydoc = blocksToYDoc(reader, [
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const fragment = ydoc.get("prosemirror");
    const version = Y.snapshot(ydoc);
    const user = bindEditor(fragment, { trailingBlock: false });
    user.insertBlocks(
      [{ id: "c", type: "paragraph", content: "Gamma" }],
      "b",
      "after",
    );
    unbindEditor(user);
    // An editor that is bound to the fragment can give it a renderer. This
    // renderer shows the fragment at an earlier version, without block c.
    fragment.useRenderer(Y.createSnapshotRenderer(version));
    expect(JSON.stringify(fragment.toDeltaDeep().toJSON())).not.toContain(
      "Gamma",
    );

    valid(
      updateYDoc(reader, fragment, {
        format: markdownFormat,
        text: "Alpha\n\nBeta\n\nGamma, edited\n",
      }),
    );

    expect(readText(fragment, markdownFormat)).toBe(
      "Alpha\n\nBeta\n\nGamma, edited\n",
    );
  });

  it("writes one Yjs transaction, with the client ID of the Y.Doc", () => {
    const { editor, ydoc, read } = setup();
    const fragment = ydoc.get("prosemirror");
    const clients = () => [
      ...Y.decodeStateVector(Y.encodeStateVector(ydoc)).keys(),
    ];
    let updates = 0;
    ydoc.on("update", () => updates++);
    expect(clients()).toEqual([ydoc.clientID]);

    const first = read();
    valid(
      updateYDoc(editor, fragment, {
        format: markdownFormat,
        text: replaceOnce(first.text, "Last paragraph", "Last paragraph 1"),
      }),
    );
    const second = read();
    valid(
      updateYDocWithMerge(editor, fragment, {
        format: markdownFormat,
        text: replaceOnce(second.text, "Last paragraph 1", "Last paragraph 2"),
        base: second.base,
        onConflict: "reject",
      }),
    );

    expect(updates).toBe(2);
    expect(clients()).toEqual([ydoc.clientID]);
  });

  it("allows the Yjs merge only with base, and without onConflict", () => {
    type Options = Parameters<typeof experimental_updateYDocWithYjsMerge>[2];
    const text = { format: markdownFormat, text: "" };
    const base = new Uint8Array();
    // @ts-expect-error The Yjs merge needs `base`.
    const withoutBase: Options = text;
    // @ts-expect-error Yjs merges without conflicts, thus no `onConflict`.
    const withConflict: Options = { ...text, base, onConflict: "reject" };
    const withBase: Options = { ...text, base };

    expect([withoutBase, withConflict, withBase]).toHaveLength(3);
  });

  it("allows onConflict and base only on the lens merge, where they are required", () => {
    type Write = Parameters<typeof updateYDoc>[2];
    type Merged = Parameters<typeof updateYDocWithMerge>[2];
    const text = { format: markdownFormat, text: "" };
    const base = new Uint8Array();
    // @ts-expect-error A write without a merge has no conflicts.
    const writeWithConflict: Write = { ...text, onConflict: "reject" };
    // @ts-expect-error A write without a merge is for the current document.
    const writeWithBase: Write = { ...text, base };
    // @ts-expect-error A merge write states what a conflict does.
    const mergeWithoutConflict: Merged = { ...text, base };
    // @ts-expect-error A merge write needs the version that the client read.
    const mergeWithoutBase: Merged = { ...text, onConflict: "reject" };
    const merge: Merged = { ...text, base, onConflict: "reject" };

    expect([
      writeWithConflict,
      writeWithBase,
      mergeWithoutConflict,
      mergeWithoutBase,
      merge,
    ]).toHaveLength(5);
  });

  it("changes nothing if the text did not change", () => {
    const { ydoc, read, write } = setup();
    const before = Y.encodeStateVector(ydoc);

    write(read(), (text) => text);

    expect(Y.encodeStateVector(ydoc)).toEqual(before);
  });

  it.each(merges)(
    "returns the Yjs update for the other clients (merge %s)",
    (merge) => {
      const { ydoc, read, write, change, blocks } = setup();
      const client = read();
      // Another writer changes the document after the read of the client.
      change((user) =>
        user.insertBlocks(
          [{ type: "paragraph", content: "From another writer" }],
          user.document[0].id,
          "before",
        ),
      );
      // A replica has the Y.Doc as it is before the write.
      const replica = new Y.Doc();
      Y.applyUpdateV2(replica, Y.encodeStateAsUpdateV2(ydoc));

      const result = write(
        client,
        (text) => replaceOnce(text, "Last paragraph", "Last paragraph, edited"),
        merge,
      );
      Y.applyUpdateV2(replica, result.updateV2);

      expect(yDocToBlocks(reader, replica)).toEqual(blocks());
      expect(Y.encodeStateAsUpdateV2(replica)).toEqual(
        Y.encodeStateAsUpdateV2(ydoc),
      );
    },
  );
});

/**
 * `updateYDoc` with a Yjs state as `base`: the write applies only if the
 * document of the fragment is still at that version.
 */
const threeParagraphs: PartialBlock[] = [
  { id: "a", type: "paragraph", content: "Alpha" },
  { id: "b", type: "paragraph", content: "Beta" },
  { id: "c", type: "paragraph", content: "Gamma" },
];

describe("a base that is a V1 update of Yjs", () => {
  it("throws, and does not change the Y.Doc", () => {
    const ydoc = blocksToYDoc(
      reader,
      BlockNoteEditor.create({ initialContent: threeParagraphs }).document,
    );
    const fragment = ydoc.get("prosemirror");
    const before = Y.encodeStateAsUpdateV2(ydoc);
    // The V1 format (`Y.encodeStateAsUpdate`). The lens has no check for it:
    // the decoder of Yjs throws.
    const base = Y.encodeStateAsUpdate(ydoc);
    const change = { format: markdownFormat, text: "Alpha, edited\n", base };

    expect(() => yDocChangesAfterBase(reader, fragment, base)).toThrow();
    expect(() =>
      updateYDocWithMerge(reader, fragment, {
        ...change,
        onConflict: "reject",
      }),
    ).toThrow();
    expect(() =>
      experimental_updateYDocWithYjsMerge(reader, fragment, change),
    ).toThrow();
    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(before);
  });
});

describe("yDocChangesAfterBase", () => {
  it("gives no changes if no other writer changed the document", () => {
    const { editor, ydoc, read } = setup(threeParagraphs);
    const client = read();

    expect(
      yDocChangesAfterBase(editor, ydoc.get("prosemirror"), client.base),
    ).toEqual({ changesOfOthers: [] });
  });

  it("gives the changes of other writers, and does not change the Y.Doc", () => {
    const { editor, ydoc, read, change } = setup(threeParagraphs);
    const client = read();
    change((user) => {
      user.updateBlock("b", { content: "Beta, changed" });
      user.removeBlocks(["c"]);
    });
    const before = Y.encodeStateAsUpdateV2(ydoc);

    const result = yDocChangesAfterBase(
      editor,
      ydoc.get("prosemirror"),
      client.base,
    );

    expect(result).toEqual({
      changesOfOthers: expect.arrayContaining([
        expect.objectContaining({ type: "update", id: "b" }),
        { type: "delete", id: "c" },
      ]),
    });
    expect(result).toHaveProperty("changesOfOthers.length", 2);
    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(before);
  });

  it("gives a change of only a prop that a text format does not show", () => {
    const { editor, ydoc, read, change } = setup(threeParagraphs);
    const client = read();
    change((user) => user.updateBlock("b", { props: { textColor: "red" } }));

    expect(
      yDocChangesAfterBase(editor, ydoc.get("prosemirror"), client.base),
    ).toEqual({
      changesOfOthers: [expect.objectContaining({ type: "update", id: "b" })],
    });
  });

  it("does not take a change in a different part of the Y.Doc for a change of the document", () => {
    // A compare of state vectors would give a change.
    const { editor, ydoc, read } = setup(threeParagraphs);
    const client = read();
    ydoc.get("settings").setAttr("title", "A new title");

    expect(
      yDocChangesAfterBase(editor, ydoc.get("prosemirror"), client.base),
    ).toEqual({ changesOfOthers: [] });
  });

  it("gives a removal of a block only, which does not change the state vector", () => {
    const { editor, ydoc, read, change } = setup(threeParagraphs);
    const client = read();
    const vector = Y.encodeStateVector(ydoc);
    change((user) => user.removeBlocks(["c"]));
    // A compare of state vectors would give no change.
    expect(Y.encodeStateVector(ydoc)).toEqual(vector);

    expect(
      yDocChangesAfterBase(editor, ydoc.get("prosemirror"), client.base),
    ).toEqual({ changesOfOthers: [{ type: "delete", id: "c" }] });
  });

  // After these changes, the document is the same as at `base`, but the
  // Y.Doc has new Yjs items. A compare of state vectors would give a change.
  it.each<[string, (user: BlockNoteEditor<any, any, any>) => void]>([
    [
      "typed text and removed it again",
      (user) => {
        typeAfter(user, "Alpha", "!");
        user.updateBlock("a", { content: "Alpha" });
      },
    ],
    [
      "removed a child and inserted it again",
      (user) => {
        const child = user.getBlock("b1");
        user.removeBlocks(["b1"]);
        expect(user.getBlock("b")?.children).toEqual([]);
        user.insertBlocks([child!], "b", "last-child");
      },
    ],
    [
      "nested a block and moved it back",
      (user) => {
        user.setTextCursorPosition("c");
        user.nestBlock();
        expect(user.getBlock("b")?.children).toHaveLength(2);
        user.unnestBlock();
      },
    ],
  ])("gives no changes, if another writer %s", (_name, edit) => {
    const { editor, ydoc, read, change, blocks } = setup([
      { id: "a", type: "paragraph", content: "Alpha" },
      {
        id: "b",
        type: "paragraph",
        content: "Beta",
        children: [{ id: "b1", type: "paragraph", content: "Child" }],
      },
      { id: "c", type: "paragraph", content: "Gamma" },
    ]);
    const client = read();
    const atBase = blocks();
    const vector = Y.encodeStateVector(ydoc);
    change(edit);
    expect(Y.encodeStateVector(ydoc)).not.toEqual(vector);
    expect(blocks()).toEqual(atBase);

    expect(
      yDocChangesAfterBase(editor, ydoc.get("prosemirror"), client.base),
    ).toEqual({ changesOfOthers: [] });
  });

  it("gives no changes, if the content of the fragment changed but the blocks did not", () => {
    // A Y.Doc of an earlier version of BlockNote: a block without children
    // has no block group. A block that gets a child and loses it again keeps
    // an empty block group in the fragment. The blocks do not show it.
    const ydoc = new Y.Doc();
    const fragment = ydoc.get("prosemirror");
    fragment.applyDelta(
      pmnodeToDelta(
        BlockNoteEditor.create({ initialContent: threeParagraphs })
          .prosemirrorState.doc,
      ),
    );
    const base = Y.encodeStateAsUpdateV2(ydoc);
    const content = JSON.stringify(fragment.toDeltaDeep().toJSON());
    const user = bindEditor(fragment, { trailingBlock: false });
    user.setTextCursorPosition("c");
    user.nestBlock();
    user.unnestBlock();
    unbindEditor(user);
    expect(JSON.stringify(fragment.toDeltaDeep().toJSON())).not.toBe(content);

    expect(yDocChangesAfterBase(reader, fragment, base)).toEqual({
      changesOfOthers: [],
    });
  });

  it("compares the content as it is, not as a renderer of the fragment shows it", () => {
    const { editor, ydoc, read, change } = setup(threeParagraphs);
    const fragment = ydoc.get("prosemirror");
    const client = read();
    const version = Y.snapshot(ydoc);
    change((user) =>
      user.insertBlocks([{ id: "d", type: "paragraph" }], "c", "after"),
    );
    // An editor that is bound to the fragment can give it a renderer. This
    // renderer shows the fragment at the version of the read.
    fragment.useRenderer(Y.createSnapshotRenderer(version));
    expect(JSON.stringify(fragment.toDeltaDeep().toJSON())).not.toContain(
      '"d"',
    );

    expect(yDocChangesAfterBase(editor, fragment, client.base)).toEqual({
      changesOfOthers: [
        expect.objectContaining({
          type: "insert",
          block: expect.objectContaining({ id: "d" }),
        }),
      ],
    });
  });

  it("gives no changes for a version without content, if the Y.Doc has no content", () => {
    const ydoc = new Y.Doc();
    const base = Y.encodeStateAsUpdateV2(ydoc);

    expect(yDocChangesAfterBase(reader, ydoc.get("prosemirror"), base)).toEqual(
      { changesOfOthers: [] },
    );
  });

  it("gives the content of the document as a change, for a version without content", () => {
    const ydoc = new Y.Doc();
    const fragment = ydoc.get("prosemirror");
    const base = Y.encodeStateAsUpdateV2(ydoc);
    valid(
      updateYDoc(reader, fragment, {
        format: markdownFormat,
        text: "Other",
      }),
    );

    expect(yDocChangesAfterBase(reader, fragment, base)).toMatchObject({
      changesOfOthers: [{ type: "insert" }],
    });
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
        base: Y.encodeStateAsUpdateV2(ydoc),
      }),
    );

    expect(readText(fragment, format).trim()).toBe("Hello");
  });

  it.each(merges)(
    "keeps the text of another writer, if the base is an empty Y.Doc (merge %s)",
    (merge) => {
      const ydoc = new Y.Doc();
      const fragment = ydoc.get("prosemirror");
      const base = Y.encodeStateAsUpdateV2(ydoc);
      valid(
        updateYDoc(reader, fragment, {
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

  /**
   * A Y.Doc whose fragment has a root block group without blocks.
   * `blocksToYDoc(editor, [])` of the versions 0.52 to 0.55 wrote this. The
   * current version writes nothing for a document without blocks.
   */
  function yDocWithEmptyRootGroup(): Y.Doc {
    const ydoc = new Y.Doc();
    const schema = reader.pmSchema;
    ydoc
      .get("prosemirror")
      .applyDelta(
        pmnodeToDelta(
          schema.topNodeType.create(null, schema.nodes["blockGroup"].create()),
          { transformer: blockNoteTransformer },
        ),
      );
    return ydoc;
  }

  it("writes text to a Y.Doc with a root block group without blocks", () => {
    const ydoc = yDocWithEmptyRootGroup();
    const fragment = ydoc.get("prosemirror");
    expect(fragment.length).toBe(1);
    expect(yDocToBlocks(reader, ydoc)).toEqual([]);
    valid(
      updateYDoc(reader, fragment, {
        format,
        text: "Hello",
      }),
    );

    expect(readText(fragment, format).trim()).toBe("Hello");
    // The write uses the root block group that is there: a second root
    // block group is not a valid document.
    expect(fragment.length).toBe(1);
    expect(idsOf(ydoc)).toHaveLength(1);
    const user = bindEditor(fragment, { trailingBlock: false });
    expect(getDocumentText(user, format).trim()).toBe("Hello");
    unbindEditor(user);
  });

  it.each(merges)(
    "writes text with a base from a Y.Doc with a root block group without blocks (merge %s)",
    (merge) => {
      const ydoc = yDocWithEmptyRootGroup();
      const fragment = ydoc.get("prosemirror");
      valid(
        mergeWrite(
          reader,
          fragment,
          { format, text: "Hello", base: Y.encodeStateAsUpdateV2(ydoc) },
          merge,
        ),
      );

      expect(readText(fragment, format).trim()).toBe("Hello");
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
        format,
        text: "",
      }),
    );
    valid(
      updateYDoc(editor, fragment, {
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
    const before = Y.encodeStateAsUpdateV2(ydoc);

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
    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(before);
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
            base: Y.encodeStateAsUpdateV2(ydoc),
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
 * A write to a Y.Doc must give the same document as a write to an editor
 * without Yjs.
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

      valid(updateDocument(editor, { format, text }));
      valid(
        updateYDoc(reader, fragment, {
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
        format: markdownFormat,
        text,
      }),
    );
    const reference = BlockNoteEditor.create({ initialContent: nested });
    valid(
      updateDocument(reference, {
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
  /**
   * A test that fails with the Yjs merge: the write removes the column that
   * it empties, and a removal in a Y.Doc removes the changes of other writers
   * in the removed block.
   */
  const itEmptyColumn = merge === "yjs" ? it.fails : it;
  /**
   * A test that fails with the Yjs merge: two writers each remove a
   * different column of one column list, and Yjs keeps the two removals.
   * Yjs does not know the schema: a column list needs two columns.
   */
  const itLastColumn = merge === "yjs" ? it.fails : it;

  const schema = columnSchema;
  const editor = BlockNoteEditor.create({ schema });
  const format = markdownFormat;

  /**
   * A Y.Doc with a column list (one column for each text, with one
   * paragraph) and the paragraph "End". A client reads its text and its
   * Yjs state (`base`).
   */
  function columnsOf(texts: string[]) {
    const ydoc = blocksToYDoc(
      editor,
      BlockNoteEditor.create({
        schema,
        initialContent: [
          {
            id: "list",
            type: "columnList",
            children: texts.map((text) => ({
              id: `column-${text}`,
              type: "column",
              children: [{ id: text, type: "paragraph", content: text }],
            })),
          },
          { id: "end", type: "paragraph", content: "End" },
        ] as PartialBlock<any, any, any>[],
      }).document,
    );
    const fragment = ydoc.get("prosemirror");
    return {
      ydoc,
      fragment,
      text: getYDocText(editor, fragment, format),
      base: Y.encodeStateAsUpdateV2(ydoc),
    };
  }

  /**
   * Another writer adds a block between Alpha and Bravo. Markdown does not
   * show the columns, thus the block goes into the column of Bravo, before
   * Bravo (a new block goes into the nesting of the next block).
   */
  function addBlockToColumnOfBravo(text: string) {
    return text.replace("Alpha", "Alpha\n\nAdded by other");
  }

  /** A writer removes a paragraph. Its column becomes empty, thus the column goes. */
  function removeParagraph(text: string, paragraph: string) {
    return text.replace(`${paragraph}\n\n`, "");
  }

  /**
   * Another writer changes the document (`other`). Then a client that did
   * not read that change removes "Bravo": for the client, the column of
   * "Bravo" becomes empty.
   */
  function emptyColumnOfBravo(
    texts: string[],
    other: (text: string) => string,
  ) {
    const { ydoc, fragment, text, base } = columnsOf(texts);
    valid(
      updateYDoc(editor, fragment, {
        format,
        text: other(text),
      }),
    );

    valid(
      mergeWrite(
        editor,
        fragment,
        { format, text: removeParagraph(text, "Bravo"), base },
        merge,
      ),
    );
    return { ydoc, fragment };
  }

  /**
   * The content of the Y.Doc fits the schema: an editor that binds to the
   * fragment repairs nothing, thus it does not change the Y.Doc.
   */
  function expectNoRepair(ydoc: Y.Doc, fragment: Y.Node) {
    const before = Y.encodeStateAsUpdateV2(ydoc);
    const user = bindEditor(fragment, { schema });
    expect(user.document).toEqual(yDocToBlocks(editor, ydoc));
    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(before);
  }

  /**
   * The number of columns of each column list at the top level of the
   * Y.Doc. The function reads the Y.Doc as it is: a reader with the schema
   * does not show a column list with one column.
   */
  function columnCounts(fragment: Y.Node): number[] {
    const rootGroup: unknown = fragment.get(0);
    if (!(rootGroup instanceof Y.Node)) {
      throw new Error("The fragment has no root block group.");
    }
    const counts: number[] = [];
    for (let index = 0; index < rootGroup.length; index++) {
      const node: unknown = rootGroup.get(index);
      if (node instanceof Y.Node && node.name === "columnList") {
        counts.push(node.length);
      }
    }
    return counts;
  }

  /**
   * The Y.Doc has a column list with one column, which does not fit the
   * schema. A read does not show the column list. An editor that binds to
   * the fragment removes it from the Y.Doc, with the paragraph "Alpha".
   */
  function expectOneColumnThatAnEditorRemoves(fragment: Y.Node) {
    expect(columnCounts(fragment)).toEqual([1]);
    expect(readText(fragment, format, { schema })).toBe("End\n");
    unbindEditor(bindEditor(fragment, { schema }));
    expect(columnCounts(fragment)).toEqual([]);
    expect(readText(fragment, format, { schema })).toBe("End\n");
  }

  itEmptyColumn(
    "keeps a block that another writer added to a column, when the text empties that column",
    () => {
      const { fragment } = emptyColumnOfBravo(
        ["Alpha", "Bravo"],
        addBlockToColumnOfBravo,
      );

      expect(readText(fragment, format, { schema })).toBe(
        "Alpha\n\nAdded by other\n\nEnd\n",
      );
    },
  );

  itLastColumn(
    "keeps the blocks of the last column, when the text empties a column and another writer removes a different column",
    () => {
      const { ydoc, fragment } = emptyColumnOfBravo(
        ["Alpha", "Bravo", "Charlie"],
        (text) => removeParagraph(text, "Charlie"),
      );

      // A column list with one column becomes the blocks of that column.
      expect(readText(fragment, format, { schema })).toBe("Alpha\n\nEnd\n");
      expectNoRepair(ydoc, fragment);
    },
  );

  // The limits of the Yjs merge, as they are now.
  if (merge === "yjs") {
    // The document fits the schema, and the block of the other writer is
    // lost.
    it("removes the column that the text empties, with the block that another writer added to it", () => {
      const { ydoc, fragment } = emptyColumnOfBravo(
        ["Alpha", "Bravo", "Charlie"],
        addBlockToColumnOfBravo,
      );

      expect(documentShape(yDocToBlocks(editor, ydoc))).toEqual([
        "list",
        ["column-Alpha", ["Alpha"], "column-Charlie", ["Charlie"]],
        "end",
      ]);
      expectNoRepair(ydoc, fragment);
    });

    it("removes a column list that keeps one column, with the block that another writer added to the empty column", () => {
      const { ydoc, fragment } = emptyColumnOfBravo(
        ["Alpha", "Bravo"],
        addBlockToColumnOfBravo,
      );

      // The fit of the write for `base`: a column list with one column
      // becomes the blocks of that column.
      expect(documentShape(yDocToBlocks(editor, ydoc))).toEqual([
        "Alpha",
        "end",
      ]);
      expectNoRepair(ydoc, fragment);
    });

    // The document does not fit the schema, and a block that no writer
    // changed is lost.
    it("gives a column list with one column, which an editor removes, when the text empties a column and another writer removes a different column", () => {
      const { fragment } = emptyColumnOfBravo(
        ["Alpha", "Bravo", "Charlie"],
        (text) => removeParagraph(text, "Charlie"),
      );

      expectOneColumnThatAnEditorRemoves(fragment);
    });

    // The same document without `experimental_updateYDocWithYjsMerge`: the
    // limit is in the merge of Yjs, which each writer to a Y.Doc gets.
    it("gives the same column list with one column for a write without a merge to a Y.Doc that is out of date, after the sync", () => {
      const { ydoc, fragment, text, base } = columnsOf([
        "Alpha",
        "Bravo",
        "Charlie",
      ]);
      const replica = new Y.Doc();
      Y.applyUpdateV2(replica, base);
      valid(
        updateYDoc(editor, replica.get("prosemirror"), {
          format,
          text: removeParagraph(text, "Charlie"),
        }),
      );

      valid(
        updateYDoc(editor, fragment, {
          format,
          text: removeParagraph(text, "Bravo"),
        }),
      );
      Y.applyUpdateV2(ydoc, Y.encodeStateAsUpdateV2(replica));

      expectOneColumnThatAnEditorRemoves(fragment);
    });
  }
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
    Y.applyUpdateV2(other, Y.encodeStateAsUpdateV2(ydoc));
    // The other client changes Alpha. The lens does not have this change yet.
    bindEditor(other.get("prosemirror")).updateBlock("a", {
      content: "Alpha of the other client",
    });

    // The text adds a block at the start and at the end of the list.
    const fragment = ydoc.get("prosemirror");
    const editor = bindEditor(fragment);
    valid(
      updateYDoc(editor, fragment, {
        format: markdownFormat,
        text: "First\n\nAlpha\n\nBeta\n\nGamma\n\nLast\n",
      }),
    );
    Y.applyUpdateV2(ydoc, Y.encodeStateAsUpdateV2(other));

    expect(getDocumentText(editor, markdownFormat)).toBe(
      "First\n\nAlpha of the other client\n\nBeta\n\nGamma\n\nLast\n",
    );
  });

  it("keeps a change of another client in its block, also with the API for an editor", () => {
    // updateDocument on an editor that is bound to a Y.Doc (for
    // example AI in a collaborative editor) uses the same transactions.
    const ydoc = blocksToYDoc(BlockNoteEditor.create(), blocks);
    const other = new Y.Doc();
    Y.applyUpdateV2(other, Y.encodeStateAsUpdateV2(ydoc));
    bindEditor(other.get("prosemirror")).updateBlock("a", {
      content: "Alpha of the other client",
    });

    const fragment = ydoc.get("prosemirror");
    const editor = bindEditor(fragment);
    valid(
      updateDocument(editor, {
        format: markdownFormat,
        text: "First\n\nAlpha\n\nBeta\n\nGamma\n\nLast\n",
      }),
    );
    Y.applyUpdateV2(ydoc, Y.encodeStateAsUpdateV2(other));

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
      const base = Y.encodeStateAsUpdateV2(ydoc);
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
      const base = Y.encodeStateAsUpdateV2(ydoc);
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
    const base = Y.encodeStateAsUpdateV2(ydoc);
    const text = getYDocText(reader, fragment, markdownFormat);
    const change = {
      format: markdownFormat,
      text: replaceOnce(text, "Alpha copy", "Alpha copy edited"),
    };

    expect(() => updateYDoc(reader, fragment, { ...change })).toThrow(
      "Two blocks of the current document have the ID a",
    );
    expect(() => mergeWrite(reader, fragment, { ...change, base })).toThrow(
      "Two blocks of the current document have the ID a",
    );
    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(base);
  });
});

describe("a write that fails", () => {
  it("throws, and does not change the Y.Doc, if the schema of the editor cannot read the Y.Doc", () => {
    // The Y.Doc has a column list. The editor of the write has the default
    // schema, without columns. The read of the fragment throws for the node
    // type that the schema does not have, before the write changes a Y.Doc.
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
    const before = Y.encodeStateAsUpdateV2(ydoc);

    expect(() =>
      updateYDoc(reader, fragment, {
        format: markdownFormat,
        text: "End, edited\n",
      }),
    ).toThrow();
    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(before);
  });
});

describe("a base with an update that the Y.Doc does not have yet", () => {
  /**
   * A Y.Doc of a server, and the change of a client that reads from a
   * replica. `edit` changes the replica first: the server does not have
   * that update yet.
   */
  function serverAndReplica(
    edit: (replica: BlockNoteEditor<any, any, any>) => void,
    change: (text: string) => string,
  ) {
    const server = blocksToYDoc(BlockNoteEditor.create(), [
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);
    const replica = new Y.Doc();
    Y.applyUpdateV2(replica, Y.encodeStateAsUpdateV2(server));
    edit(bindEditor(replica.get("prosemirror")));
    return {
      server,
      fragment: server.get("prosemirror"),
      change: {
        format: markdownFormat,
        text: change(readText(replica.get("prosemirror"), markdownFormat)),
        base: Y.encodeStateAsUpdateV2(replica),
      },
    };
  }
  /** The replica has a new block, and the client changes that block. */
  const withNewBlock = () =>
    serverAndReplica(
      (replica) =>
        replica.insertBlocks(
          [{ type: "paragraph", content: "Gamma" }],
          "b",
          "after",
        ),
      (text) => replaceOnce(text, "Gamma", "Gamma edited"),
    );

  it.each(merges)(
    "gives the error unknown-base, and does not change the Y.Doc (merge %s)",
    (merge) => {
      const { server, fragment, change } = withNewBlock();
      const before = Y.encodeStateAsUpdateV2(server);

      expect(mergeWrite(reader, fragment, change, merge)).toEqual({
        error: "unknown-base",
      });
      expect(Y.encodeStateAsUpdateV2(server)).toEqual(before);
    },
  );

  it("gives the error unknown-base for the check, until the Y.Doc gets the update of the replica", () => {
    const { server, fragment, change } = withNewBlock();

    expect(yDocChangesAfterBase(reader, fragment, change.base)).toEqual({
      error: "unknown-base",
    });

    Y.applyUpdateV2(server, change.base);

    expect(yDocChangesAfterBase(reader, fragment, change.base)).toEqual({
      changesOfOthers: [],
    });
  });

  it("gives the error unknown-base for the check, if the replica only removed a block", () => {
    // A removal does not change the state vector of a Y.Doc: the check also
    // compares the removals.
    const { fragment, change } = serverAndReplica(
      (replica) => replica.removeBlocks(["b"]),
      (text) => replaceOnce(text, "Alpha", "Alpha edited"),
    );

    expect(yDocChangesAfterBase(reader, fragment, change.base)).toEqual({
      error: "unknown-base",
    });
  });

  it.each(merges)(
    "applies the write after the Y.Doc gets the update of the replica (merge %s)",
    (merge) => {
      const { server, fragment, change } = withNewBlock();
      // The caller syncs the Y.Doc: here, it applies `base`.
      Y.applyUpdateV2(server, change.base);

      const result = valid(mergeWrite(reader, fragment, change, merge));

      expect(result.warnings).toEqual([]);
      expect(readText(fragment, markdownFormat)).toBe(
        "Alpha\n\nBeta\n\nGamma edited\n",
      );
    },
  );
});

describe("computeYDocOperations and applyYDocOperations", () => {
  it("computes the operations, and does not change the Y.Doc", () => {
    const { editor, ydoc, read } = setup(threeParagraphs);
    const client = read();
    const before = Y.encodeStateAsUpdateV2(ydoc);

    const result = valid(
      computeYDocOperations(editor, ydoc.get("prosemirror"), {
        format: markdownFormat,
        text: replaceOnce(client.text, "Alpha", "Alpha, changed"),
      }),
    );

    expect(result.operations).toEqual([
      expect.objectContaining({ type: "update", id: "a" }),
    ]);
    expect(result).not.toHaveProperty("updateV2");
    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(before);
  });

  it("writes the computed operations, and gives the Yjs update of the write", () => {
    const { editor, ydoc, read } = setup(threeParagraphs);
    const fragment = ydoc.get("prosemirror");
    const replica = new Y.Doc();
    Y.applyUpdateV2(replica, Y.encodeStateAsUpdateV2(ydoc));
    const client = read();
    const { operations } = valid(
      computeYDocOperations(editor, fragment, {
        format: markdownFormat,
        text: replaceOnce(client.text, "Alpha", "Alpha, changed"),
      }),
    );

    const updateV2 = applyYDocOperations(editor, fragment, operations);

    expect(readText(fragment, markdownFormat)).toBe(
      replaceOnce(client.text, "Alpha", "Alpha, changed"),
    );
    Y.applyUpdateV2(replica, updateV2);
    expect(Y.encodeStateAsUpdateV2(replica)).toEqual(
      Y.encodeStateAsUpdateV2(ydoc),
    );
  });

  it("computes the operations of a merge without a change of the Y.Doc, and writes them", () => {
    const { editor, ydoc, read, change } = setup(threeParagraphs);
    const fragment = ydoc.get("prosemirror");
    const client = read();
    change((user) => user.updateBlock("b", { content: "Beta, changed" }));
    const before = Y.encodeStateAsUpdateV2(ydoc);

    const result = valid(
      computeYDocOperationsWithMerge(editor, fragment, {
        format: markdownFormat,
        text: replaceOnce(client.text, "Alpha", "Alpha, from the client"),
        base: client.base,
        onConflict: "reject",
      }),
    );

    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(before);
    expect(result.changesOfOthers).toEqual([
      expect.objectContaining({ type: "update", id: "b" }),
    ]);
    expect(result).not.toHaveProperty("updateV2");

    applyYDocOperations(editor, fragment, result.operations);

    expect(readText(fragment, markdownFormat)).toBe(
      replaceOnce(
        replaceOnce(client.text, "Alpha", "Alpha, from the client"),
        "Beta",
        "Beta, changed",
      ),
    );
  });

  it("throws, and does not change the Y.Doc, for an operation that is not for the document", () => {
    const { editor, ydoc } = setup(threeParagraphs);
    const before = Y.encodeStateAsUpdateV2(ydoc);

    expect(() =>
      applyYDocOperations(editor, ydoc.get("prosemirror"), [
        { type: "delete", id: "not-a-block" },
      ]),
    ).toThrow();
    expect(Y.encodeStateAsUpdateV2(ydoc)).toEqual(before);
  });
});

describe("a write to a Y.Doc that fails", () => {
  const twoParagraphs = () =>
    blocksToYDoc(BlockNoteEditor.create(), [
      { id: "a", type: "paragraph", content: "Alpha" },
      { id: "b", type: "paragraph", content: "Beta" },
    ]);

  it.each(["no merge", ...merges] as const)(
    "does not change the Y.Doc if the document of the client is not valid (%s)",
    (how) => {
      const server = twoParagraphs();
      const fragment = server.get("prosemirror");
      const before = Y.encodeStateAsUpdateV2(server);
      const document = [{ id: "a", type: "not-a-block-type" }] as any;

      const result =
        how === "no merge"
          ? updateYDoc(reader, fragment, { document })
          : how === "yjs"
            ? experimental_updateYDocWithYjsMerge(reader, fragment, {
                document,
                base: before,
              })
            : updateYDocWithMerge(reader, fragment, {
                document,
                base: before,
                onConflict: "keep-current",
              });

      expect(result.error).toBe("invalid-document");
      expect(Y.encodeStateAsUpdateV2(server)).toEqual(before);
    },
  );

  it("gives a complete copy of the Y.Doc from the updates of the results, also after a check that finds changes", () => {
    const server = twoParagraphs();
    const fragment = server.get("prosemirror");
    // `stored` gets only the updates of the results, as a store without a
    // provider does.
    const stored = new Y.Doc();
    Y.applyUpdateV2(stored, Y.encodeStateAsUpdateV2(server));
    const change = {
      format: markdownFormat,
      text: "Alpha\n\nBeta\n\nGamma\n",
      base: Y.encodeStateAsUpdateV2(server),
    };
    // Another writer changes the Y.Doc after the read of the client.
    const other = valid(
      updateYDoc(reader, fragment, {
        format: markdownFormat,
        text: "Alpha, changed\n\nBeta\n",
      }),
    );
    Y.applyUpdateV2(stored, other.updateV2);
    // The check finds the change of the other writer. It writes nothing.
    expect(yDocChangesAfterBase(reader, fragment, change.base)).toHaveProperty(
      "changesOfOthers.length",
      1,
    );

    // The client writes with a merge.
    const merged = valid(mergeWrite(reader, fragment, change));
    Y.applyUpdateV2(stored, merged.updateV2);

    expect(readText(fragment, markdownFormat)).toBe(
      "Alpha, changed\n\nBeta\n\nGamma\n",
    );
    expect(Y.encodeStateAsUpdateV2(stored)).toEqual(
      Y.encodeStateAsUpdateV2(server),
    );
  });
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
          expect.objectContaining({ type: "update", id: "b" }),
          { type: "delete", id: "c" },
        ]),
      );
    });
  },
);

/**
 * A write to a Y.Doc, while another replica types `typed` after the text
 * `after`. Then the two replicas sync. Returns the ID, the type and the text
 * of each block.
 */
function writeWhileOtherTypes(
  blocks: PartialBlock[],
  document: PartialBlock[],
  [after, typed]: [string, string],
) {
  const ydoc = blocksToYDoc(
    reader,
    BlockNoteEditor.create({ initialContent: blocks }).document,
  );
  const other = new Y.Doc();
  Y.applyUpdateV2(other, Y.encodeStateAsUpdateV2(ydoc));
  typeAfter(
    bindEditor(other.get("prosemirror"), { trailingBlock: false }),
    after,
    typed,
  );

  valid(updateYDoc(reader, ydoc.get("prosemirror"), { document }));

  Y.applyUpdateV2(
    ydoc,
    Y.encodeStateAsUpdateV2(other, Y.encodeStateVector(ydoc)),
  );
  Y.applyUpdateV2(
    other,
    Y.encodeStateAsUpdateV2(ydoc, Y.encodeStateVector(other)),
  );
  expect(yDocToBlocks(reader, other)).toEqual(yDocToBlocks(reader, ydoc));
  return yDocToBlocks(reader, ydoc).map((block) => [
    block.id,
    block.type,
    (block.content as { text: string }[])[0]?.text,
  ]);
}

// The write makes one difference of the document before and after it
// (`docDiffToDelta` of core). The first four cases fail if that difference
// pairs the changed blocks of a list by their type, and not by their block
// ID: then the text that the other replica typed goes into a different
// block.
describe("a write to a Y.Doc while another replica types", () => {
  const paragraph = (id: string, content: string): PartialBlock => ({
    id,
    type: "paragraph",
    content,
  });
  const three = [
    paragraph("a", "Alpha"),
    paragraph("b", "Beta"),
    paragraph("c", "Gamma"),
  ];

  it("keeps a change of another replica in a block, with an insert before that block", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          paragraph("a", "Alpha"),
          paragraph("new", "New"),
          paragraph("b", "Changed Beta"),
          paragraph("c", "Gamma"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["a", "paragraph", "Alpha"],
      ["new", "paragraph", "New"],
      ["b", "paragraph", "Changed Beta!"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("keeps a change of another replica in a block, with a removal before that block", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [paragraph("b", "Changed Beta"), paragraph("c", "Gamma")],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["b", "paragraph", "Changed Beta!"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("does not put a change of another replica to a removed block into the new block at its place", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          paragraph("a", "Alpha"),
          paragraph("new", "New"),
          paragraph("c", "Gamma"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["a", "paragraph", "Alpha"],
      ["new", "paragraph", "New"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("keeps a change of another replica in a block, with a type change of the block before it", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          { id: "a", type: "heading", content: "Alpha" },
          paragraph("b", "Changed Beta"),
          paragraph("c", "Gamma"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["a", "heading", "Alpha"],
      ["b", "paragraph", "Changed Beta!"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("keeps a change of another replica in a block, with inserts at the start and at the end of the list", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [paragraph("first", "First"), ...three, paragraph("last", "Last")],
        ["Alpha", " of the other client"],
      ),
    ).toEqual([
      ["first", "paragraph", "First"],
      ["a", "paragraph", "Alpha of the other client"],
      ["b", "paragraph", "Beta"],
      ["c", "paragraph", "Gamma"],
      ["last", "paragraph", "Last"],
    ]);
  });

  it("keeps a change of another replica between two changes in one paragraph", () => {
    expect(
      writeWhileOtherTypes(
        [paragraph("p", "one two three")],
        [paragraph("p", "First one two three Last")],
        ["tw", "X"],
      ),
    ).toEqual([["p", "paragraph", "First one twXo three Last"]]);
  });

  it("keeps a change of another replica in a block, with text changes of two adjacent blocks", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          paragraph("a", "Changed Alpha"),
          paragraph("b", "Changed Beta"),
          paragraph("c", "Gamma"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["a", "paragraph", "Changed Alpha"],
      ["b", "paragraph", "Changed Beta!"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("is not a change of the user of a bound editor: the undo of that editor does not revert it", () => {
    const ydoc = blocksToYDoc(
      reader,
      BlockNoteEditor.create({ initialContent: three }).document,
    );
    const fragment = ydoc.get("prosemirror");
    const editor = bindEditor(fragment, { trailingBlock: false });

    valid(
      updateYDoc(reader, fragment, {
        document: [
          paragraph("a", "Alpha changed"),
          paragraph("b", "Beta"),
          paragraph("c", "Gamma"),
        ],
      }),
    );
    expect(getDocumentText(editor, plainTextFormat)).toContain("Alpha changed");

    editor.undo();
    expect(getDocumentText(editor, plainTextFormat)).toContain("Alpha changed");
    expect(getYDocText(reader, fragment, plainTextFormat)).toContain(
      "Alpha changed",
    );
  });

  it("keeps a change of another replica in a block that a move passes", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          paragraph("c", "Gamma"),
          paragraph("a", "Alpha"),
          paragraph("b", "Beta"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["c", "paragraph", "Gamma"],
      ["a", "paragraph", "Alpha"],
      ["b", "paragraph", "Beta!"],
    ]);
  });
});
