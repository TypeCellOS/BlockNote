import { Fragment, Slice } from "@tiptap/pm/model";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BlockNoteEditor } from "./BlockNoteEditor.js";
import { stripAttribution } from "./transformPasted.js";

/**
 * @vitest-environment jsdom
 */
describe("stripAttribution (paste filter)", () => {
  let editor: BlockNoteEditor;
  const div = document.createElement("div");

  beforeAll(() => {
    editor = BlockNoteEditor.create();
    editor.mount(div);
  });

  afterAll(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  // Collect every mark name that survives the transform, across the whole slice.
  function collectMarkNames(slice: Slice): string[] {
    const names: string[] = [];
    slice.content.descendants((node) => {
      for (const mark of node.marks) {
        names.push(mark.type.name);
      }
      return true;
    });
    return names;
  }

  // Collect all text content that survives the transform.
  function collectText(slice: Slice): string {
    let text = "";
    slice.content.descendants((node) => {
      if (node.isText) {
        text += node.text ?? "";
      }
      return true;
    });
    return text;
  }

  it("drops y-attributed-delete text and strips all y-attributed-* marks", () => {
    const view = editor.prosemirrorView!;
    const schema = view.state.schema;

    const insertMark = schema.marks["y-attributed-insert"].create({
      userIds: ["user-1"],
      timestamp: 1,
    });
    const deleteMark = schema.marks["y-attributed-delete"].create({
      userIds: ["user-1"],
      timestamp: 1,
    });

    // A paragraph whose inline content is: inserted text + deleted text + plain
    // text. Wrap it in a blockContainer so it's a valid top-level paste node.
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text("inserted ", [insertMark]),
      schema.text("deleted ", [deleteMark]),
      schema.text("plain"),
    ]);
    const container = schema.nodes.blockContainer.create(null, paragraph);

    const slice = new Slice(Fragment.from(container), 0, 0);

    const result = stripAttribution(slice, view);

    const text = collectText(result);
    const markNames = collectMarkNames(result);

    // Deleted content must be gone.
    expect(text).not.toContain("deleted");
    // Surviving (inserted + plain) content must remain.
    expect(text).toContain("inserted");
    expect(text).toContain("plain");
    expect(text).toBe("inserted plain");

    // No attribution marks may remain on anything.
    expect(markNames).not.toContain("y-attributed-insert");
    expect(markNames).not.toContain("y-attributed-delete");
    expect(markNames).not.toContain("y-attributed-format");
  });

  it("canonicalizes a *--attributed block node to its base type, and drops a deleted one", () => {
    const view = editor.prosemirrorView!;
    const schema = view.state.schema;

    // Sanity: the attributed variant node types exist in the schema.
    expect(schema.nodes["paragraph--attributed"]).toBeDefined();

    const insertedBlock = schema.nodes["paragraph--attributed"].create(
      { "y-attributed": { type: "insert" } },
      schema.text("kept"),
    );
    const deletedBlock = schema.nodes["paragraph--attributed"].create(
      { "y-attributed": { type: "delete" } },
      schema.text("removed"),
    );

    const slice = new Slice(
      Fragment.from([
        schema.nodes.blockContainer.create(null, insertedBlock),
        schema.nodes.blockContainer.create(null, deletedBlock),
      ]),
      0,
      0,
    );

    const result = stripAttribution(slice, view);

    // The deleted block's text is gone; the inserted block's text remains.
    expect(collectText(result)).toBe("kept");

    // No `*--attributed` node types survive.
    const nodeTypeNames: string[] = [];
    result.content.descendants((node) => {
      nodeTypeNames.push(node.type.name);
      return true;
    });
    expect(nodeTypeNames.some((n) => n.endsWith("--attributed"))).toBe(false);
    expect(nodeTypeNames).toContain("paragraph");
  });
});
