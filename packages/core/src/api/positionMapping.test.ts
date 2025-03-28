import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { PositionStorage } from "./positionMapping.js";

describe("PositionStorage with local editor", () => {
  let editor: BlockNoteEditor;
  let positionStorage: PositionStorage;

  beforeEach(() => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));
    positionStorage = new PositionStorage(editor);
  });

  afterEach(() => {
    editor.mount(undefined);
    editor._tiptapEditor.destroy();
  });

  describe("mount and unmount", () => {
    it("should register transaction handler on creation", () => {
      editor._tiptapEditor.on = vi.fn();
      new PositionStorage(editor);

      expect(editor._tiptapEditor.on).toHaveBeenCalledWith(
        "transaction",
        expect.any(Function)
      );
    });
  });

  describe("set and get positions", () => {
    it("should store and retrieve positions without Y.js", () => {
      positionStorage.set("test-id", 10);
      expect(positionStorage.get("test-id")).toBe(10);
    });

    it("should handle right side positions", () => {
      positionStorage.set("test-id", 10, "right");
      expect(positionStorage.get("test-id")).toBe(10);
    });

    it("should be undefined when getting a non-existent position", () => {
      expect(positionStorage.get("non-existent")).toBeUndefined();
    });

    it("should remove positions", () => {
      positionStorage.set("test-id", 10);
      positionStorage.remove("test-id");
      expect(positionStorage.get("test-id")).toBeUndefined();
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
      "before"
    );

    // Start tracking
    positionStorage.set("test-id", 10);

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
    expect(positionStorage.get("test-id")).toBe(14);
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
      "before"
    );
    // Start tracking
    positionStorage.set("test-id", 10);

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
    expect(positionStorage.get("test-id")).toBe(10);
  });

  it("should track positions on each side", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    positionStorage.set("cursor", 6);
    positionStorage.set("start", 3);
    positionStorage.set("start-right", 3, "right");
    positionStorage.set("pos-after", 4);
    positionStorage.set("pos-after-right", 4, "right");

    // Insert text at the beginning
    editor._tiptapEditor.commands.insertContentAt(3, "Test ");

    // Position should be updated
    expect(positionStorage.get("cursor")).toBe(11); // 6 + 5 ("Test " length)
    expect(positionStorage.get("start")).toBe(3); // 3
    expect(positionStorage.get("start-right")).toBe(8); // 3 + 5 ("Test " length)
    expect(positionStorage.get("pos-after")).toBe(9); // 4 + 5 ("Test " length)
    expect(positionStorage.get("pos-after-right")).toBe(9); // 4 + 5 ("Test " length)
  });

  it("should handle multiple transactions", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: "Hello World",
      },
    ]);

    // Store position at "Hello| World"
    positionStorage.set("cursor", 6);
    positionStorage.set("start", 3);
    positionStorage.set("start-right", 3, "right");
    positionStorage.set("pos-after", 4);
    positionStorage.set("pos-after-right", 4, "right");

    // Insert text at the beginning
    editor._tiptapEditor.commands.insertContentAt(3, "T");
    editor._tiptapEditor.commands.insertContentAt(4, "e");
    editor._tiptapEditor.commands.insertContentAt(5, "s");
    editor._tiptapEditor.commands.insertContentAt(6, "t");
    editor._tiptapEditor.commands.insertContentAt(7, " ");

    // Position should be updated
    expect(positionStorage.get("cursor")).toBe(11); // 6 + 5 ("Test " length)
    expect(positionStorage.get("start")).toBe(3); // 3
    expect(positionStorage.get("start-right")).toBe(8); // 3 + 5 ("Test " length)
    expect(positionStorage.get("pos-after")).toBe(9); // 4 + 5 ("Test " length)
    expect(positionStorage.get("pos-after-right")).toBe(9); // 4 + 5 ("Test " length)
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
    let localPositionStorage: PositionStorage;
    let remoteEditor: BlockNoteEditor;
    let remotePositionStorage: PositionStorage;
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
      // Create a new PositionStorage instance
      localPositionStorage = new PositionStorage(localEditor);

      remoteEditor = BlockNoteEditor.create({
        collaboration: {
          fragment: remoteYdoc.getXmlFragment("doc"),
          user: { color: "#ff0000", name: "Remote User" },
          provider: undefined,
        },
      });

      const remoteDiv = document.createElement("div");
      remoteEditor.mount(remoteDiv);
      remotePositionStorage = new PositionStorage(remoteEditor);
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
      localPositionStorage.set("cursor", 6);
      // Store position at "|Hello World"
      localPositionStorage.set("start", 3);
      // Store position at "|Hello World" (but on the right side)
      localPositionStorage.set("start-right", 3, "right");
      // Store position at "H|ello World"
      localPositionStorage.set("pos-after", 4);
      // Store position at "H|ello World" (but on the right side)
      localPositionStorage.set("pos-after-right", 4, "right");

      // Insert text at the beginning
      localEditor._tiptapEditor.commands.insertContentAt(3, "Test ");

      // Position should be updated
      expect(localPositionStorage.get("cursor")).toBe(11); // 6 + 5 ("Test " length)
      expect(localPositionStorage.get("start")).toBe(3); // 3
      expect(localPositionStorage.get("start-right")).toBe(8); // 3 + 5 ("Test " length)
      expect(localPositionStorage.get("pos-after")).toBe(9); // 4 + 5 ("Test " length)
      expect(localPositionStorage.get("pos-after-right")).toBe(9); // 4 + 5 ("Test " length)
    });

    it("should handle multiple transactions when collaborating", () => {
      localEditor.replaceBlocks(localEditor.document, [
        {
          type: "paragraph",
          content: "Hello World",
        },
      ]);

      // Store position at "Hello| World"
      localPositionStorage.set("cursor", 6);
      // Store position at "|Hello World"
      localPositionStorage.set("start", 3);
      // Store position at "|Hello World" (but on the right side)
      localPositionStorage.set("start-right", 3, "right");
      // Store position at "H|ello World"
      localPositionStorage.set("pos-after", 4);
      // Store position at "H|ello World" (but on the right side)
      localPositionStorage.set("pos-after-right", 4, "right");

      // Insert text at the beginning
      localEditor._tiptapEditor.commands.insertContentAt(3, "T");
      localEditor._tiptapEditor.commands.insertContentAt(4, "e");
      localEditor._tiptapEditor.commands.insertContentAt(5, "s");
      localEditor._tiptapEditor.commands.insertContentAt(6, "t");
      localEditor._tiptapEditor.commands.insertContentAt(7, " ");

      // Position should be updated
      expect(localPositionStorage.get("cursor")).toBe(11); // 6 + 5 ("Test " length)
      expect(localPositionStorage.get("start")).toBe(3); // 3
      expect(localPositionStorage.get("start-right")).toBe(8); // 3 + 5 ("Test " length)
      expect(localPositionStorage.get("pos-after")).toBe(9); // 4 + 5 ("Test " length)
      expect(localPositionStorage.get("pos-after-right")).toBe(9); // 4 + 5 ("Test " length)
    });

    it("should update the local position from a remote transaction", () => {
      remoteEditor.replaceBlocks(remoteEditor.document, [
        {
          type: "paragraph",
          content: "Hello World",
        },
      ]);

      // Store position at "Hello| World"
      localPositionStorage.set("cursor", 6);
      // Store position at "|Hello World"
      localPositionStorage.set("start", 3);
      // Store position at "|Hello World" (but on the right side)
      localPositionStorage.set("start-right", 3, "right");
      // Store position at "H|ello World"
      localPositionStorage.set("pos-after", 4);
      // Store position at "H|ello World" (but on the right side)
      localPositionStorage.set("pos-after-right", 4, "right");

      // Insert text at the beginning
      localEditor._tiptapEditor.commands.insertContentAt(3, "Test ");

      // Position should be updated
      expect(localPositionStorage.get("cursor")).toBe(11); // 6 + 5 ("Test " length)
      expect(localPositionStorage.get("start")).toBe(3); // 3
      expect(localPositionStorage.get("start-right")).toBe(8); // 3 + 5 ("Test " length)
      expect(localPositionStorage.get("pos-after")).toBe(9); // 4 + 5 ("Test " length)
      expect(localPositionStorage.get("pos-after-right")).toBe(9); // 4 + 5 ("Test " length)
    });

    it("should update the remote position from a remote transaction", () => {
      remoteEditor.replaceBlocks(remoteEditor.document, [
        {
          type: "paragraph",
          content: "Hello World",
        },
      ]);

      // Store position at "Hello| World"
      remotePositionStorage.set("cursor", 6);
      // Store position at "|Hello World"
      remotePositionStorage.set("start", 3);
      // Store position at "|Hello World" (but on the right side)
      remotePositionStorage.set("start-right", 3, "right");
      // Store position at "H|ello World"
      remotePositionStorage.set("pos-after", 4);
      // Store position at "H|ello World" (but on the right side)
      remotePositionStorage.set("pos-after-right", 4, "right");

      // Insert text at the beginning
      localEditor._tiptapEditor.commands.insertContentAt(3, "Test ");

      // Position should be updated
      expect(remotePositionStorage.get("cursor")).toBe(11); // 6 + 5 ("Test " length)
      expect(remotePositionStorage.get("start")).toBe(3); // 3
      expect(remotePositionStorage.get("start-right")).toBe(8); // 3 + 5 ("Test " length)
      expect(remotePositionStorage.get("pos-after")).toBe(9); // 4 + 5 ("Test " length)
      expect(remotePositionStorage.get("pos-after-right")).toBe(9); // 4 + 5 ("Test " length)
    });
  });
});
