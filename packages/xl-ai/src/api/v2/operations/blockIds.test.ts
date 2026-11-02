import { BlockNoteEditor } from "@blocknote/core";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { addMissingBlockIds } from "./blockIds.js";

describe("addMissingBlockIds", () => {
  it("gives an ID to each block without an ID, and keeps the other IDs", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ id: "a", type: "paragraph", content: "A" }],
    });
    const schema = editor.pmSchema;
    // An empty document, filled as ProseMirror fills it: one block without an ID.
    const filled = schema.topNodeType.createAndFill();
    if (filled === null) {
      throw new Error("The schema cannot fill a document");
    }
    const tr = EditorState.create({ doc: filled }).tr;
    addMissingBlockIds(tr);

    const ids: unknown[] = [];
    tr.doc.descendants((node) => {
      if (node.type.isInGroup("bnBlock")) {
        ids.push(node.attrs.id);
      }
    });
    expect(ids).toHaveLength(1);
    expect(typeof ids[0]).toBe("string");

    const kept = EditorState.create({ doc: editor.prosemirrorState.doc }).tr;
    addMissingBlockIds(kept);
    expect(kept.steps).toHaveLength(0);
  });
});
