import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { ReadOnlyExtension } from "../ReadOnly/ReadOnly.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../schema/blocks/createSpec.js";

const customItem = createBlockSpec(
  { type: "customItem", propSchema: {}, content: "inline" },
  {
    meta: { listItem: true },
    render() {
      const dom = document.createElement("p");
      return { dom, contentDOM: dom };
    },
  },
)();
const schema = BlockNoteSchema.create().extend({ blockSpecs: { customItem } });
const cleanups: (() => void)[] = [];

function createEditor(editable = false) {
  const editor = BlockNoteEditor.create({
    schema,
    _tiptapOptions: { editable },
  });
  const host = document.createElement("div");
  document.body.append(host);
  editor.mount(host);
  cleanups.push(() => {
    editor.unmount();
    host.remove();
  });
  return { editor, host };
}

function lists(host: HTMLElement) {
  return Array.from(host.querySelectorAll('[role="list"]')).map((owner) => {
    const ids = owner.getAttribute("aria-owns")!.split(" ");
    return ids.map((id) => {
      const item = document.getElementById(id);
      expect(item).not.toBeNull();
      expect(host.contains(item)).toBe(true);
      expect(item!.getAttribute("role")).toBe("listitem");
      expect(item!.classList.contains("bn-block-outer")).toBe(true);
      return item!.getAttribute("data-id");
    });
  });
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("list accessibility", () => {
  it("exposes read-only content as a document and restores input semantics", () => {
    const { editor, host } = createEditor(true);
    const root = host;
    const readOnly = editor.getExtension(ReadOnlyExtension)!;
    expect(root.getAttribute("role")).toBe("textbox");
    expect(root.getAttribute("aria-autocomplete")).toBe("list");
    editor.isEditable = false;
    expect(root.getAttribute("role")).toBe("document");
    expect(root.hasAttribute("aria-autocomplete")).toBe(false);
    expect(root.hasAttribute("aria-haspopup")).toBe(false);
    readOnly.setReadOnly(true, "preview");
    editor.isEditable = true;
    expect(root.getAttribute("role")).toBe("document");
    readOnly.setReadOnly(false, "preview");
    expect(root.getAttribute("role")).toBe("textbox");
    expect(root.getAttribute("aria-haspopup")).toBe("listbox");
  });

  it("only exposes list ownership while read-only, including after edits", () => {
    const { editor, host } = createEditor(true);
    editor.replaceBlocks(editor.document, [
      { id: "a", type: "bulletListItem" },
      { id: "b", type: "bulletListItem" },
    ]);
    expect(host.querySelector('[aria-owns], [role="listitem"]')).toBeNull();
    editor.isEditable = false;
    expect(lists(host)).toEqual([["a", "b"]]);
    editor.isEditable = true;
    expect(host.querySelector('[aria-owns], [role="listitem"]')).toBeNull();
    expect(host.querySelector('[data-id="a"]')!.hasAttribute("id")).toBe(false);
    editor.updateBlock("b", { type: "numberedListItem" });
    const readOnly = editor.getExtension(ReadOnlyExtension)!;
    readOnly.setReadOnly(true, "preview");
    expect(lists(host)).toEqual([["a"], ["b"]]);
    readOnly.setReadOnly(false, "preview");
    expect(host.querySelector('[aria-owns], [role="listitem"]')).toBeNull();
  });

  it("groups same-type siblings and supports custom list items", () => {
    const { editor, host } = createEditor();
    editor.replaceBlocks(editor.document, [
      { id: "a", type: "bulletListItem" },
      { id: "b", type: "bulletListItem" },
      { id: "c", type: "numberedListItem" },
      { type: "paragraph" },
      { id: "d", type: "numberedListItem" },
      { id: "e", type: "checkListItem" },
      { id: "f", type: "toggleListItem" },
      { id: "g", type: "customItem" },
      { id: "h", type: "customItem" },
    ]);
    expect(lists(host)).toEqual([
      ["a", "b"],
      ["c"],
      ["d"],
      ["e"],
      ["f"],
      ["g", "h"],
    ]);
    const owner = host.querySelector<HTMLElement>('[role="list"]')!;
    expect(owner.nextElementSibling?.getAttribute("data-id")).toBe("a");
    expect(getComputedStyle(owner).display).not.toBe("none");
    expect(getComputedStyle(owner).visibility).toBe("visible");
    expect(owner.hasAttribute("aria-hidden")).toBe(false);
  });

  it("keeps non-list children and nested lists inside their parent item", () => {
    const { editor, host } = createEditor();
    editor.replaceBlocks(editor.document, [
      {
        id: "parent",
        type: "bulletListItem",
        children: [
          { id: "explanation", type: "paragraph", content: "Explanation" },
          { id: "nested", type: "numberedListItem" },
        ],
      },
      { id: "sibling", type: "bulletListItem" },
    ]);
    expect(lists(host)).toEqual([["parent", "sibling"], ["nested"]]);
    const parent = host.querySelector('[role="listitem"][data-id="parent"]')!;
    expect(parent.querySelector('[data-id="explanation"]')).not.toBeNull();
    expect(parent.querySelector('[role="list"]')).not.toBeNull();
    expect(
      host.querySelector('[data-id="explanation"]')!.hasAttribute("role"),
    ).toBe(false);
  });

  it("splits, merges, and removes lists when blocks change", () => {
    const { editor, host } = createEditor();
    editor.replaceBlocks(editor.document, [
      { id: "a", type: "bulletListItem" },
      { id: "b", type: "bulletListItem" },
      { id: "c", type: "bulletListItem" },
    ]);
    const originalId = host.querySelector('[role="listitem"][data-id="a"]')!.id;
    editor.updateBlock("b", { type: "paragraph" });
    expect(lists(host)).toEqual([["a"], ["c"]]);
    expect(host.querySelector('[data-id="b"]')!.hasAttribute("role")).toBe(
      false,
    );
    editor.updateBlock("b", { type: "bulletListItem" });
    expect(lists(host)).toEqual([["a", "b", "c"]]);
    expect(host.querySelector('[role="listitem"][data-id="a"]')!.id).toBe(
      originalId,
    );
    editor.removeBlocks(["a", "b", "c"]);
    expect(lists(host)).toEqual([]);
    expect(host.querySelector('[role="listitem"]')).toBeNull();
  });

  it("namespaces IDs across editors and works in read-only mode", () => {
    const first = createEditor();
    const second = createEditor();
    for (const { editor, host } of [first, second]) {
      editor.replaceBlocks(editor.document, [
        { id: "same id", type: "bulletListItem" },
      ]);
      editor.isEditable = false;
      expect(lists(host)).toEqual([["same id"]]);
      expect(editor.document[0].id).toBe("same id");
    }
    expect(first.host.querySelector('[role="listitem"]')!.id).not.toBe(
      second.host.querySelector('[role="listitem"]')!.id,
    );
  });
});
