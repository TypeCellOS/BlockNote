import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { trackPosition } from "./positionMapping.js";

describe("PositionStorage with local editor", () => {
  let editor: BlockNoteEditor;

  beforeEach(() => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));
  });

  afterEach(() => {
    editor.mount(undefined);
    editor._tiptapEditor.destroy();
  });

  describe("mount and unmount", () => {
    it("should register transaction handler on creation", () => {
      editor._tiptapEditor.on = vi.fn();
      trackPosition(editor, 0);

      expect(editor._tiptapEditor.on).toHaveBeenCalledWith(
        "transaction",
        expect.any(Function),
      );
    });
  });

  describe("set and get positions", () => {
    it("should store and retrieve positions without Y.js", () => {
      const getPos = trackPosition(editor, 10);

      expect(getPos()).toBe(10);
    });

    it("should handle right side positions", () => {
      const getPos = trackPosition(editor, 10, "right");

      expect(getPos()).toBe(10);
    });
  });

  it("should update mapping for local transactions before the position", () => {
    // Set initial content
    editor.insertBlocks(
      [
        {
          id: "1",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello World",
              styles: {},
            },
          ],
        },
      ],
      editor.document[0],
      "before",
    );

    // Start tracking
    const getPos = trackPosition(editor, 10);

    // Move the cursor to the start of the document
    editor.setTextCursorPosition(editor.document[0], "start");

    // Insert text at the start of the document
    editor.insertInlineContent([
      {
        type: "text",
        text: "Test",
        styles: {},
      },
    ]);

    // Position should be updated according to mapping
    expect(getPos()).toBe(14);
  });

  it("should not update mapping for local transactions after the position", () => {
    // Set initial content
    editor.insertBlocks(
      [
        {
          id: "1",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hello World",
              styles: {},
            },
          ],
        },
      ],
      editor.document[0],
      "before",
    );
    // Start tracking
    const getPos = trackPosition(editor, 10);

    // Move the cursor to the end of the document
    editor.setTextCursorPosition(editor.document[0], "end");

    // Insert text at the end of the document
    editor.insertInlineContent([
      {
        type: "text",
        text: "Test",
        styles: {},
      },
    ]);

    // Position should not be updated
    expect(getPos()).toBe(10);
  });

  it("should track positions on each side", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(editor, 6);
    const getStartPos = trackPosition(editor, 3);
    const getStartRightPos = trackPosition(editor, 3, "right");
    const getPosAfterPos = trackPosition(editor, 4);
    const getPosAfterRightPos = trackPosition(editor, 4, "right");
    // Insert text at the beginning
    editor._tiptapEditor.commands.insertContentAt(3, "Test ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)
  });

  it("should handle multiple transactions", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    const getCursorPos = trackPosition(editor, 6);
    const getStartPos = trackPosition(editor, 3);
    const getStartRightPos = trackPosition(editor, 3, "right");
    const getPosAfterPos = trackPosition(editor, 4);
    const getPosAfterRightPos = trackPosition(editor, 4, "right");

    // Insert text at the beginning
    editor._tiptapEditor.commands.insertContentAt(3, "T");
    editor._tiptapEditor.commands.insertContentAt(4, "e");
    editor._tiptapEditor.commands.insertContentAt(5, "s");
    editor._tiptapEditor.commands.insertContentAt(6, "t");
    editor._tiptapEditor.commands.insertContentAt(7, " ");

    // Position should be updated
    expect(getCursorPos()).toBe(11); // 6 + 5 ("Test " length)
    expect(getStartPos()).toBe(3); // 3
    expect(getStartRightPos()).toBe(8); // 3 + 5 ("Test " length)
    expect(getPosAfterPos()).toBe(9); // 4 + 5 ("Test " length)
    expect(getPosAfterRightPos()).toBe(9); // 4 + 5 ("Test " length)
  });
});

describe("PositionStorage with remote editor", () => {
  // Function to sync two documents
  function syncDocs(sourceDoc: Y.Doc, targetDoc: Y.Doc) {
    // Create update message from source
    const update = Y.encodeStateAsUpdate(sourceDoc);

    // Apply update to target
    Y.applyUpdate(targetDoc, update);
  }

  // Set up two-way sync
  function setupTwoWaySync(doc1: Y.Doc, doc2: Y.Doc) {
    // Sync initial states
    syncDocs(doc1, doc2);
    syncDocs(doc2, doc1);

    // Set up observers for future changes
    doc1.on("update", (update: Uint8Array) => {
      Y.applyUpdate(doc2, update);
    });

    doc2.on("update", (update: Uint8Array) => {
      Y.applyUpdate(doc1, update);
    });
  }

  describe("remote editor", () => {
    let localEditor: BlockNoteEditor;
    let remoteEditor: BlockNoteEditor;
    let ydoc: Y.Doc;
    let remoteYdoc: Y.Doc;

    beforeEach(() => {
      ydoc = new Y.Doc();
      remoteYdoc = new Y.Doc();
      // Create a mock editor
      localEditor = BlockNoteEditor.create({
        collaboration: {
          fragment: ydoc.getXmlFragment("doc"),
          user: { color: "#ff0000", name: "Local User" },
          provider: undefined,
        },
      });
      const div = document.createElement("div");
      localEditor.mount(div);

      remoteEditor = BlockNoteEditor.create({
        collaboration: {
          fragment: remoteYdoc.getXmlFragment("doc"),
          user: { color: "#ff0000", name: "Remote User" },
          provider: undefined,
        },
      });

      const remoteDiv = document.createElement("div");
      remoteEditor.mount(remoteDiv);
      setupTwoWaySync(ydoc, remoteYdoc);
    });

    afterEach(() => {
      ydoc.destroy();
      remoteYdoc.destroy();
      localEditor.mount(undefined);
      localEditor._tiptapEditor.destroy();
      remoteEditor.mount(undefined);
      remoteEditor._tiptapEditor.destroy();
    });

    it("should update the local position when collaborating", () => {
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
    });

    it("should handle multiple transactions when collaborating", () => {
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
    });

    it("should update the local position from a remote transaction", () => {
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
    });

    it("should update the remote position from a remote transaction", () => {
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
    });
  });
});
