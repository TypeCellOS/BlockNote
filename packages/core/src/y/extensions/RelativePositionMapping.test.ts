/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import * as Y from "@y/y";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { trackPosition } from "../../api/positionMapping.js";
import { withCollaboration } from "./index.js";

// Function to sync two documents
function syncDocs(sourceDoc: Y.Doc, targetDoc: Y.Doc) {
  const update = Y.encodeStateAsUpdate(sourceDoc);
  Y.applyUpdate(targetDoc, update);
}

// Set up two-way sync
function setupTwoWaySync(doc1: Y.Doc, doc2: Y.Doc) {
  syncDocs(doc1, doc2);
  syncDocs(doc2, doc1);

  doc1.on("update", (update: Uint8Array) => {
    Y.applyUpdate(doc2, update);
  });

  doc2.on("update", (update: Uint8Array) => {
    Y.applyUpdate(doc1, update);
  });
}

describe("RelativePositionMapping (@y/y)", () => {
  it("should return the same position when no changes are made", () => {
    const ydoc = new Y.Doc();
    const remoteYdoc = new Y.Doc();

    const localEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: ydoc.get("doc"),
          user: { color: "#ff0000", name: "Local User" },
          provider: undefined,
        },
      }),
    );
    const div = document.createElement("div");
    localEditor.mount(div);

    const remoteEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: remoteYdoc.get("doc"),
          user: { color: "#ff0000", name: "Remote User" },
          provider: undefined,
        },
      }),
    );

    const remoteDiv = document.createElement("div");
    remoteEditor.mount(remoteDiv);
    setupTwoWaySync(ydoc, remoteYdoc);

    const nodeSize = localEditor.prosemirrorState.doc.nodeSize;
    const positions: number[] = [];
    for (let i = 0; i < nodeSize; i++) {
      positions.push(trackPosition(localEditor, i)());
    }

    expect(positions).toMatchInlineSnapshot(`
      [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
      ]
    `);

    ydoc.destroy();
    remoteYdoc.destroy();
    localEditor.unmount();
    remoteEditor.unmount();
  });
  it("should update the local position when collaborating", () => {
    const ydoc = new Y.Doc();
    const remoteYdoc = new Y.Doc();

    const localEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: ydoc.get("doc"),
          user: { color: "#ff0000", name: "Local User" },
          provider: undefined,
        },
      }),
    );
    const div = document.createElement("div");
    localEditor.mount(div);

    const remoteEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: remoteYdoc.get("doc"),
          user: { color: "#ff0000", name: "Remote User" },
          provider: undefined,
        },
      }),
    );

    const remoteDiv = document.createElement("div");
    remoteEditor.mount(remoteDiv);
    setupTwoWaySync(ydoc, remoteYdoc);

    localEditor.replaceBlocks(localEditor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(localEditor, 6);
    // Store position at "|Hello World"
    const getStartPos = trackPosition(localEditor, 3);
    // Store position at "|Hello World" (but on the right side)
    const getStartRightPos = trackPosition(localEditor, 3, "right");
    // Store position at "H|ello World"
    const getPosAfterPos = trackPosition(localEditor, 4);
    // Store position at "H|ello World" (but on the right side)
    const getPosAfterRightPos = trackPosition(localEditor, 4, "right");

    // Insert text at the beginning
    localEditor._tiptapEditor.commands.insertContentAt(3, "Test ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)

    ydoc.destroy();
    remoteYdoc.destroy();
    localEditor.unmount();
    remoteEditor.unmount();
  });

  it("should match the same positions", () => {
    const ydoc = new Y.Doc();
    const remoteYdoc = new Y.Doc();

    const localEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: ydoc.get("doc"),
          user: { color: "#ff0000", name: "Local User" },
          provider: undefined,
        },
      }),
    );
    const div = document.createElement("div");
    localEditor.mount(div);

    const remoteEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: remoteYdoc.get("doc"),
          user: { color: "#ff0000", name: "Remote User" },
          provider: undefined,
        },
      }),
    );

    const remoteDiv = document.createElement("div");
    remoteEditor.mount(remoteDiv);
    setupTwoWaySync(ydoc, remoteYdoc);

    localEditor.replaceBlocks(localEditor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    const nodeSize = localEditor.prosemirrorState.doc.nodeSize;
    const positions: (() => number)[] = [];
    for (let i = 0; i < nodeSize; i++) {
      positions.push(trackPosition(localEditor, i));
    }

    localEditor._tiptapEditor.commands.insertContentAt(3, "Test ");

    expect(positions.map((getPos) => getPos())).toMatchInlineSnapshot(`
      [
        0,
        1,
        2,
        3,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
      ]
    `);
    ydoc.destroy();
    remoteYdoc.destroy();
    localEditor.unmount();
    remoteEditor.unmount();
  });

  it("should handle multiple transactions when collaborating", () => {
    const ydoc = new Y.Doc();
    const remoteYdoc = new Y.Doc();

    const localEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: ydoc.get("doc"),
          user: { color: "#ff0000", name: "Local User" },
          provider: undefined,
        },
      }),
    );
    const div = document.createElement("div");
    localEditor.mount(div);

    const remoteEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: remoteYdoc.get("doc"),
          user: { color: "#ff0000", name: "Remote User" },
          provider: undefined,
        },
      }),
    );

    const remoteDiv = document.createElement("div");
    remoteEditor.mount(remoteDiv);
    setupTwoWaySync(ydoc, remoteYdoc);

    localEditor.replaceBlocks(localEditor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(localEditor, 6);
    // Store position at "|Hello World"
    const getStartPos = trackPosition(localEditor, 3);
    // Store position at "|Hello World" (but on the right side)
    const getStartRightPos = trackPosition(localEditor, 3, "right");
    // Store position at "H|ello World"
    const getPosAfterPos = trackPosition(localEditor, 4);
    // Store position at "H|ello World" (but on the right side)
    const getPosAfterRightPos = trackPosition(localEditor, 4, "right");

    // Insert text at the beginning
    localEditor._tiptapEditor.commands.insertContentAt(3, "T");
    localEditor._tiptapEditor.commands.insertContentAt(4, "e");
    localEditor._tiptapEditor.commands.insertContentAt(5, "s");
    localEditor._tiptapEditor.commands.insertContentAt(6, "t");
    localEditor._tiptapEditor.commands.insertContentAt(7, " ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)

    ydoc.destroy();
    remoteYdoc.destroy();
    localEditor.unmount();
    remoteEditor.unmount();
  });

  it("should update the local position from a remote transaction", () => {
    const ydoc = new Y.Doc();
    const remoteYdoc = new Y.Doc();

    const localEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: ydoc.get("doc"),
          user: { color: "#ff0000", name: "Local User" },
          provider: undefined,
        },
      }),
    );
    const div = document.createElement("div");
    localEditor.mount(div);

    const remoteEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: remoteYdoc.get("doc"),
          user: { color: "#ff0000", name: "Remote User" },
          provider: undefined,
        },
      }),
    );

    const remoteDiv = document.createElement("div");
    remoteEditor.mount(remoteDiv);
    setupTwoWaySync(ydoc, remoteYdoc);

    remoteEditor.replaceBlocks(remoteEditor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(localEditor, 6);
    // Store position at "|Hello World"
    const getStartPos = trackPosition(localEditor, 3);
    // Store position at "|Hello World" (but on the right side)
    const getStartRightPos = trackPosition(localEditor, 3, "right");
    // Store position at "H|ello World"
    const getPosAfterPos = trackPosition(localEditor, 4);
    // Store position at "H|ello World" (but on the right side)
    const getPosAfterRightPos = trackPosition(localEditor, 4, "right");

    // Insert text at the beginning
    localEditor._tiptapEditor.commands.insertContentAt(3, "Test ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)

    ydoc.destroy();
    remoteYdoc.destroy();
    localEditor.unmount();
    remoteEditor.unmount();
  });

  it("should update the remote position from a remote transaction", () => {
    const ydoc = new Y.Doc();
    const remoteYdoc = new Y.Doc();

    const localEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: ydoc.get("doc"),
          user: { color: "#ff0000", name: "Local User" },
          provider: undefined,
        },
      }),
    );
    const div = document.createElement("div");
    localEditor.mount(div);

    const remoteEditor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: remoteYdoc.get("doc"),
          user: { color: "#ff0000", name: "Remote User" },
          provider: undefined,
        },
      }),
    );

    const remoteDiv = document.createElement("div");
    remoteEditor.mount(remoteDiv);
    setupTwoWaySync(ydoc, remoteYdoc);

    remoteEditor.replaceBlocks(remoteEditor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(remoteEditor, 6);
    // Store position at "|Hello World"
    const getStartPos = trackPosition(remoteEditor, 3);
    // Store position at "|Hello World" (but on the right side)
    const getStartRightPos = trackPosition(remoteEditor, 3, "right");
    // Store position at "H|ello World"
    const getPosAfterPos = trackPosition(remoteEditor, 4);
    // Store position at "H|ello World" (but on the right side)
    const getPosAfterRightPos = trackPosition(remoteEditor, 4, "right");

    // Insert text at the beginning
    localEditor._tiptapEditor.commands.insertContentAt(3, "Test ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)

    ydoc.destroy();
    remoteYdoc.destroy();
    localEditor.unmount();
    remoteEditor.unmount();
  });
});
