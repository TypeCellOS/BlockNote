import { describe, expect, type TestContext } from "vite-plus/test";
import * as Y from "@y/y";
import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
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

async function setupPeers(
  setupEditor: SetupEditor,
  onTestFinished: TestContext["onTestFinished"],
) {
  const ydoc = new Y.Doc();
  const remoteYdoc = new Y.Doc();
  onTestFinished(() => {
    ydoc.destroy();
    remoteYdoc.destroy();
  });
  async function setupPeer(doc: Y.Doc, name: string) {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...withCollaboration({
        extensions: [],
        collaboration: {
          fragment: doc.get("doc"),
          user: { color: "#ff0000", name },
          provider: undefined,
        },
      }),
    });

    return editor;
  }
  const localEditor = await setupPeer(ydoc, "Local User");
  const remoteEditor = await setupPeer(remoteYdoc, "Remote User");
  setupTwoWaySync(ydoc, remoteYdoc);
  return { localEditor, remoteEditor };
}

describe("RelativePositionMapping (@y/y)", () => {
  it("round-trips positions in the synced document when no changes are made", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { localEditor } = await setupPeers(setupEditor, onTestFinished);
    localEditor.updateBlock(localEditor.document[0], { content: "Hello" });
    const nodeSize = localEditor.transact(({ doc }) => doc.nodeSize);
    const positions: number[] = [];
    for (let i = 0; i < nodeSize; i++) {
      positions.push(trackPosition(localEditor, i)());
    }

    expect(positions).toEqual(Array.from({ length: nodeSize }, (_, i) => i));
  });

  it("cannot yet track the cursor in the placeholder for an empty Y fragment", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { localEditor } = await setupPeers(setupEditor, onTestFinished);
    const cursor = localEditor.transact(({ selection }) => selection.from);
    expect(localEditor.document[0].content).toEqual([]);
    expect(() => trackPosition(localEditor, cursor)).toThrow(
      "Position not found, cannot track positions",
    );
  });
  it("should update the local position when collaborating", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { localEditor } = await setupPeers(setupEditor, onTestFinished);

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
    localEditor.setTextCursorPosition(localEditor.document[0], "start");
    localEditor.insertInlineContent("Test ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)
  });

  it("should match the same positions", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { localEditor } = await setupPeers(setupEditor, onTestFinished);

    localEditor.replaceBlocks(localEditor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    const nodeSize = localEditor.transact(({ doc }) => doc.nodeSize);
    const positions: (() => number)[] = [];
    for (let i = 0; i < nodeSize; i++) {
      positions.push(trackPosition(localEditor, i));
    }

    localEditor.setTextCursorPosition(localEditor.document[0], "start");
    localEditor.insertInlineContent("Test ");

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
  });

  it("should handle multiple transactions when collaborating", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { localEditor } = await setupPeers(setupEditor, onTestFinished);

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
    localEditor.setTextCursorPosition(localEditor.document[0], "start");
    for (const character of "Test ") {
      localEditor.insertInlineContent(character, { updateSelection: true });
    }

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)
  });

  it("should update the local position from a remote transaction", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { localEditor, remoteEditor } = await setupPeers(
      setupEditor,
      onTestFinished,
    );

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
    localEditor.setTextCursorPosition(localEditor.document[0], "start");
    localEditor.insertInlineContent("Test ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)
  });

  it("should update the remote position from a remote transaction", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { localEditor, remoteEditor } = await setupPeers(
      setupEditor,
      onTestFinished,
    );

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
    localEditor.setTextCursorPosition(localEditor.document[0], "start");
    localEditor.insertInlineContent("Test ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)
  });
});

it("tracks a block boundary through the view-based Yjs mapping API", async ({
  setupEditor,
  onTestFinished,
}) => {
  const doc = new Y.Doc();
  onTestFinished(() => doc.destroy());
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "#ff0000" },
        provider: undefined,
      },
    }),
  });
  editor.replaceBlocks(editor.document, [
    { id: "first", type: "paragraph", content: "first" },
    { id: "second", type: "paragraph", content: "second" },
  ]);
  await expect.poll(() => doc.get("doc").toString()).toContain("second");
  const secondBlockPosition = editor.transact(
    ({ doc }) => 1 + doc.firstChild!.firstChild!.nodeSize,
  );
  const restore = trackPosition(editor, secondBlockPosition);
  expect(restore()).toBe(secondBlockPosition);
  editor.updateBlock("first", { content: "a longer first paragraph" });
  await expect
    .poll(restore)
    .toBe(
      editor.transact(({ doc }) => 1 + doc.firstChild!.firstChild!.nodeSize),
    );
});
