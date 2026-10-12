import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

// `Block.css` applies a block's colors to its children from the block's own
// element (`.bn-block`, or the root of its frame), so the node view keeps
// them there.
describe("block colors on the block's element", () => {
  const blockElement = (editor: BlockNoteEditor<any, any, any>, id: string) =>
    editor.domElement!.querySelector(
      `[data-node-type="blockContainer"][data-id="${id}"]`,
    )!;

  for (const [type, props] of [
    ["paragraph", {}],
    ["heading", {}],
    ["toggleListItem", {}],
    ["heading", { isToggleable: true }],
  ] as const) {
    it(`puts them on a ${type} ${JSON.stringify(props)} and follows changes`, () => {
      const editor = BlockNoteEditor.create({
        initialContent: [
          {
            id: "parent",
            type,
            props: { ...props, textColor: "red" },
            content: "Parent",
            children: [{ id: "child", type: "paragraph", content: "Child" }],
          } as any,
        ],
      });
      editor.mount(document.createElement("div"));
      try {
        const element = () => blockElement(editor, "parent");
        expect(element().getAttribute("data-text-color")).toBe("red");
        expect(element().hasAttribute("data-background-color")).toBe(false);

        editor.updateBlock("parent", {
          props: { textColor: "default", backgroundColor: "blue" },
        } as any);
        expect(element().hasAttribute("data-text-color")).toBe(false);
        expect(element().getAttribute("data-background-color")).toBe("blue");
      } finally {
        editor._tiptapEditor.destroy();
      }
    });
  }
});

// As with ProseMirror's default, a change of the block's type keeps its view
// (and its children's), unless the new type draws a frame or the old one did.
describe("block type changes", () => {
  function editorWithParent() {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          id: "parent",
          type: "paragraph",
          content: "Parent",
          children: [{ id: "child", type: "paragraph", content: "Child" }],
        },
      ],
    });
    editor.mount(document.createElement("div"));
    const element = (id: string) =>
      editor.domElement!.querySelector(
        `[data-node-type="blockContainer"][data-id="${id}"]`,
      );
    return { editor, element };
  }

  it("keeps the block and its children between types without a frame", () => {
    const { editor, element } = editorWithParent();
    try {
      const [parent, child] = [element("parent"), element("child")];
      editor.updateBlock("parent", { type: "heading" });
      editor.updateBlock("parent", { type: "bulletListItem" });
      expect(element("parent")).toBe(parent);
      expect(element("child")).toBe(child);
    } finally {
      editor._tiptapEditor.destroy();
    }
  });

  it("draws the block again when the frame comes or goes", () => {
    const { editor, element } = editorWithParent();
    try {
      const parent = element("parent");
      editor.updateBlock("parent", { type: "toggleListItem" });
      const toggled = element("parent")!;
      expect(toggled).not.toBe(parent);
      // The frame's root is the block's element, in place of `.bn-block`.
      expect(toggled.matches(".bn-toggle-frame")).toBe(true);
      expect(toggled.matches(".bn-block")).toBe(false);
      expect(toggled.parentElement!.matches(".bn-block-outer")).toBe(true);

      editor.updateBlock("parent", { type: "paragraph" });
      expect(element("parent")).not.toBe(toggled);
      expect(element("parent")!.matches(".bn-block")).toBe(true);
      expect(element("parent")!.querySelector(".bn-toggle-frame")).toBeNull();
      expect(element("parent")!.textContent).toContain("Child");
    } finally {
      editor._tiptapEditor.destroy();
    }
  });
});
