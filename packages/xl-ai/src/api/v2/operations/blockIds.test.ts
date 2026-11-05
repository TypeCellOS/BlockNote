// @vitest-environment node
import { BlockNoteEditor } from "@blocknote/core";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import { fixBlockIds, withDistinctIds } from "./blockIds.js";

describe("fixBlockIds", () => {
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
    fixBlockIds(tr);

    const ids: unknown[] = [];
    tr.doc.descendants((node) => {
      if (node.type.isInGroup("bnBlock")) {
        ids.push(node.attrs.id);
      }
    });
    expect(ids).toHaveLength(1);
    expect(typeof ids[0]).toBe("string");

    const kept = EditorState.create({ doc: editor.prosemirrorState.doc }).tr;
    fixBlockIds(kept);
    expect(kept.steps).toHaveLength(0);
  });

  it("gives a new ID to a later block with the ID of an earlier block", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        { id: "x", type: "paragraph", content: "A" },
        { id: "x", type: "paragraph", content: "B" },
      ],
    });
    const tr = EditorState.create({ doc: editor.prosemirrorState.doc }).tr;
    fixBlockIds(tr);

    const ids: unknown[] = [];
    tr.doc.descendants((node) => {
      if (node.type.name === "blockContainer") {
        ids.push(node.attrs.id);
      }
    });
    expect(ids).toEqual(["x", "x-2"]);
  });
});

describe("withDistinctIds", () => {
  it("gives the blocks the IDs that fixBlockIds gives the document", () => {
    const block = (id: string, children: LensBlock[] = []): LensBlock => ({
      id,
      type: "paragraph",
      props: {},
      content: [],
      children,
    });
    const ids = (blocks: LensBlock[]): string[] =>
      blocks.flatMap((b) => [b.id, ...ids(b.children)]);
    expect(
      ids(
        withDistinctIds([block("x", [block("x")]), block("x-2"), block("y")]),
      ),
    ).toEqual(["x", "x-2", "x-2-2", "y"]);
  });
});
