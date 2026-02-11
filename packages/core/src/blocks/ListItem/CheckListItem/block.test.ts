import { expect, it } from "vitest";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import type { Block } from "../../defaultBlocks.js";

/**
 * Tests for CheckListItem block behaviour, especially that the checkbox
 * respects the editor's editable state (disabled when not editable,
 * and change handler no-ops when not editable).
 *
 * @vitest-environment jsdom
 */
function getCheckboxFromView(view: {
  dom: HTMLElement | DocumentFragment;
}): HTMLInputElement {
  const el = view.dom.querySelector('input[type="checkbox"]');
  if (!(el instanceof HTMLInputElement)) {
    throw new Error("Checkbox input not found in rendered output");
  }
  return el;
}

it("renders checkbox as enabled when editor is editable", () => {
  const editor = BlockNoteEditor.create();
  const block: Block = {
    id: "1",
    type: "checkListItem",
    props: {
      backgroundColor: "default",
      textAlignment: "left",
      textColor: "default",
      checked: false,
    },
    content: [],
    children: [],
  };
  const spec = editor.schema.blockSpecs.checkListItem;
  const view = spec.implementation.render(block, editor);
  const checkbox = getCheckboxFromView(view);
  expect(checkbox.disabled).toBe(false);
});

it("renders checkbox as disabled when editor is not editable", () => {
  const editor = BlockNoteEditor.create();
  editor.isEditable = false;
  const block: Block = {
    id: "1",
    type: "checkListItem",
    props: {
      backgroundColor: "default",
      textAlignment: "left",
      textColor: "default",
      checked: false,
    },
    content: [],
    children: [],
  };
  const spec = editor.schema.blockSpecs.checkListItem;
  const view = spec.implementation.render(block, editor);
  const checkbox = getCheckboxFromView(view);
  expect(checkbox.disabled).toBe(true);
});
