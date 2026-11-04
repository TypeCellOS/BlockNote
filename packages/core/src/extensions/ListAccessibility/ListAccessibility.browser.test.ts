import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { ListAccessibilityExtension } from "./ListAccessibility.js";

const editors: BlockNoteEditor[] = [];
const hosts: HTMLElement[] = [];

afterEach(() => {
  while (editors.length) {
    editors.pop()!._tiptapEditor.destroy();
  }
  while (hosts.length) {
    hosts.pop()!.remove();
  }
});

function mountEditor() {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "parent",
        type: "bulletListItem",
        content: "one",
        children: [
          { id: "child-a", type: "bulletListItem", content: "child one" },
          { id: "child-b", type: "bulletListItem", content: "child two" },
        ],
      },
      { id: "second", type: "bulletListItem", content: "two" },
    ],
    domAttributes: { block: { id: "consumer-id", role: "article" } },
  });
  editor.mount(host);
  editors.push(editor);
  return editor;
}

function blockElements(editor: BlockNoteEditor) {
  return [
    ...editor.prosemirrorView.dom.querySelectorAll<HTMLElement>(
      '[data-node-type="blockContainer"]',
    ),
  ];
}

describe("list accessibility node view integration", () => {
  it("sets unique list item IDs and owns references per sibling run", () => {
    const editor = mountEditor();
    const blocks = blockElements(editor);

    expect(blocks).toHaveLength(4);
    expect(blocks.map((block) => block.getAttribute("role"))).toEqual([
      "listitem",
      "listitem",
      "listitem",
      "listitem",
    ]);
    expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
    expect(blocks[0].parentElement?.getAttribute("role")).toBe("list");
    expect(blocks[0].parentElement?.getAttribute("aria-owns")).toBe(
      blocks[3].id,
    );
    expect(blocks[1].parentElement?.getAttribute("role")).toBe("list");
    expect(blocks[1].parentElement?.getAttribute("aria-owns")).toBe(
      blocks[2].id,
    );
    expect(blocks[2].parentElement?.getAttribute("role")).toBeNull();
    expect(blocks[3].parentElement?.getAttribute("role")).toBeNull();
    expect(blocks[3].parentElement?.hasAttribute("aria-owns")).toBe(false);
  });

  it("preserves consumer attributes on non-list blocks and restores on unregister", () => {
    const editor = mountEditor();
    const blocks = blockElements(editor);
    editor.updateBlock("child-a", { type: "paragraph" });

    const paragraph = blockElements(editor).find(
      (block) => block.getAttribute("role") === "article",
    );
    expect(paragraph).toBeDefined();
    expect(paragraph?.id).toBe("consumer-id");

    editor.unregisterExtension(ListAccessibilityExtension);
    expect(
      blockElements(editor).every(
        (block) =>
          block.getAttribute("role") === "article" &&
          block.id === "consumer-id",
      ),
    ).toBe(true);
    expect(blocks).toHaveLength(4);
  });
});
