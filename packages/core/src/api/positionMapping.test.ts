import { Transaction } from "prosemirror-state";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  absolutePositionToRelativePosition,
  initProseMirrorDoc,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import * as Y from "yjs";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { PositionStorage } from "./positionMapping.js";
import { Mapping, StepMap } from "prosemirror-transform";

describe("PositionStorage", () => {
  let editor: BlockNoteEditor;
  let positionStorage: PositionStorage;
  let ydoc: Y.Doc | undefined;

  beforeEach(() => {
    ydoc = new Y.Doc();
    // Create a mock editor
    editor = BlockNoteEditor.create({
      collaboration: {
        fragment: ydoc.getXmlFragment("doc"),
        user: { color: "#ff0000", name: "My Username" },
        provider: undefined,
      },
    });

    // Create a new PositionStorage instance
    positionStorage = new PositionStorage(editor);
  });

  afterEach(() => {
    if (ydoc) {
      ydoc.destroy();
      ydoc = undefined;
    }
  });

  describe("mount and unmount", () => {
    it("should register transaction handler on mount", () => {
      positionStorage.mount();

      expect(editor._tiptapEditor.on).toHaveBeenCalledWith(
        "transaction",
        expect.any(Function)
      );
    });

    it("should unregister transaction handler on unmount", () => {
      const unmount = positionStorage.mount();
      unmount();

      expect(editor._tiptapEditor.off).toHaveBeenCalledWith(
        "transaction",
        expect.any(Function)
      );
    });

    it("should clear position mapping on unmount", () => {
      const unmount = positionStorage.mount();

      // Set a position
      positionStorage.set("test-id", 10);

      // Unmount
      unmount();

      // Try to get the position (should throw)
      expect(() => positionStorage.get("test-id")).toThrow();
    });
  });

  describe("set and get positions", () => {
    beforeEach(() => {
      positionStorage.mount();
    });

    it("should store and retrieve positions without Y.js", () => {
      positionStorage.set("test-id", 10);
      expect(positionStorage.get("test-id")).toBe(10);
    });

    it("should handle right side positions", () => {
      positionStorage.set("test-id", 10, "right");
      expect(positionStorage.get("test-id")).toBe(10);
    });

    it("should throw when getting a non-existent position", () => {
      expect(() => positionStorage.get("non-existent")).toThrow();
    });

    it("should remove positions", () => {
      positionStorage.set("test-id", 10);
      positionStorage.remove("test-id");
      expect(() => positionStorage.get("test-id")).toThrow();
    });
  });

  describe("transaction handling", () => {
    beforeEach(() => {
      positionStorage.mount();
      positionStorage.set("test-id", 10);
    });

    it("should update mapping for local transactions", () => {
      // Create a mock transaction with mapping
      const mockMapping = new Mapping();
      mockMapping.appendMap(new StepMap([0, 0, 5]));
      const mockTransaction = {
        getMeta: vi.fn().mockReturnValue(undefined),
        mapping: mockMapping,
      } as unknown as Transaction;

      // // Simulate transaction
      // mockOnTransaction({ transaction: mockTransaction });

      // Position should be updated according to mapping
      expect(positionStorage.get("test-id")).toBe(15);
    });

    // it("should switch to relative positions after remote transaction", () => {
    //   const ydoc = new Y.Doc();
    //   const type = ydoc.get("prosemirror", Y.XmlFragment);
    //   const { doc: pmDoc, mapping } = initProseMirrorDoc(type, schema);
    //   // Create a mock remote transaction
    //   const mockRemoteTransaction = {
    //     getMeta: vi.fn().mockReturnValue({
    //       doc: ydoc,
    //       binding: {
    //         type: ydoc.getXmlFragment("doc"),
    //         mapping,
    //       },
    //     } satisfies YSyncPluginState),
    //   } as unknown as Transaction;

    //   // Simulate remote transaction
    //   mockOnTransaction({ transaction: mockRemoteTransaction });

    //   // Position should now be based on relative position
    //   expect(positionStorage.get("test-id")).toBe(21); // 20 + 1 for left side
    // });
  });

  describe("integration with editor", () => {
    it("should track positions through document changes", () => {
      // Create a real editor
      const realEditor = BlockNoteEditor.create({
        initialContent: [
          {
            type: "paragraph",
            content: "Hello World",
          },
        ],
      });

      const div = document.createElement("div");
      realEditor.mount(div);

      const storage = new PositionStorage(realEditor);
      storage.mount();

      // Store position at "Hello|World"
      storage.set("cursor", 6);
      storage.set("start", 3);
      storage.set("after-start", 3, "right");
      storage.set("pos-after", 4);

      console.log(realEditor.document);
      // Insert text at the beginning
      realEditor._tiptapEditor.commands.insertContentAt(3, "Test ");
      console.log(realEditor.document);

      // Position should be updated
      expect(storage.get("cursor")).toBe(11); // 6 + 5 ("Test " length)
      expect(storage.get("start")).toBe(3); // 3
      expect(storage.get("after-start")).toBe(8); // 3 + 5 ("Test " length)
      expect(storage.get("pos-after")).toBe(9); // 4 + 5 ("Test " length)
      // Clean up
      storage.unmount();
    });
  });
});
