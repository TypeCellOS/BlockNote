import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { Fragment } from "prosemirror-model";
import { findWrappingPath, wrapFragmentInDoc } from "./YSuggestions.js";

/**
 * @vitest-environment jsdom
 */

describe("findWrappingPath", () => {
  it("finds path [doc, blockGroup, blockContainer] for a checkListItem node", () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;

    const checkListItem = schema.nodes.checkListItem.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        checked: false,
      },
      [schema.text("ds")],
    );

    const path = findWrappingPath(schema, checkListItem);

    expect(path).not.toBeNull();
    expect(path!.map((t) => t.name)).toEqual([
      "doc",
      "blockGroup",
      "blockContainer",
    ]);
  });

  it("finds path [doc, blockGroup, blockContainer] for a paragraph node", () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;

    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text("hello"),
    ]);

    const path = findWrappingPath(schema, paragraph);

    expect(path).not.toBeNull();
    expect(path!.map((t) => t.name)).toEqual([
      "doc",
      "blockGroup",
      "blockContainer",
    ]);
  });
});

describe("wrapFragmentInDoc", () => {
  it("wraps a fragment with a single checkListItem", () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;

    const checkListItem = schema.nodes.checkListItem.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        checked: false,
      },
      [schema.text("ds")],
    );
    const fragment = Fragment.from(checkListItem);

    const result = wrapFragmentInDoc(fragment, schema);

    expect(result).not.toBeNull();
    expect(result!.type.name).toBe("doc");
    // Walk down to verify the content
    const blockGroup = result!.firstChild!;
    expect(blockGroup.type.name).toBe("blockGroup");
    expect(blockGroup.childCount).toBe(1);
    const bc = blockGroup.firstChild!;
    expect(bc.type.name).toBe("blockContainer");
    expect(bc.firstChild!.type.name).toBe("checkListItem");
    expect(bc.firstChild!.textContent).toBe("ds");
  });

  it("wraps a fragment with multiple block content nodes", () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;

    const item1 = schema.nodes.checkListItem.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        checked: false,
      },
      [schema.text("first")],
    );
    const item2 = schema.nodes.paragraph.create(null, [
      schema.text("second"),
    ]);
    const fragment = Fragment.from([item1, item2]);

    const result = wrapFragmentInDoc(fragment, schema);

    expect(result).not.toBeNull();
    expect(result!.type.name).toBe("doc");
    const blockGroup = result!.firstChild!;
    expect(blockGroup.type.name).toBe("blockGroup");
    // Should have two blockContainers
    expect(blockGroup.childCount).toBe(2);
    expect(blockGroup.child(0).firstChild!.type.name).toBe("checkListItem");
    expect(blockGroup.child(0).firstChild!.textContent).toBe("first");
    expect(blockGroup.child(1).firstChild!.type.name).toBe("paragraph");
    expect(blockGroup.child(1).firstChild!.textContent).toBe("second");
  });

  it("returns null for an empty fragment", () => {
    const editor = BlockNoteEditor.create();
    const result = wrapFragmentInDoc(Fragment.empty, editor.pmSchema);
    expect(result).toBeNull();
  });
});
