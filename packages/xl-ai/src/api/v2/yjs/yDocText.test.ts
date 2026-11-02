import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import {
  blocksToYDoc,
  updateYFragment,
  yDocToBlocks,
} from "@blocknote/core/yjs";
import { describe, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { markdownFormat } from "../index.js";
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
      updateYDocFromText(editor, ydoc, {
        ...options,
        text: edit(client.text),
        base: client.base,
        strategy,
      }),
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
