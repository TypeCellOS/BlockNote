import { describe, expect } from "vite-plus/test";

import type { BlockNoteEditor } from "@blocknote/core";

// `Block.css` applies a block's colors to its children from the block's own
// element, so the node view keeps them on `.bn-block`, framed or not.
describe("block colors on the block's element", () => {
  const blockElement = (editor: BlockNoteEditor, id: string) =>
    editor.domElement!.querySelector(
      `[data-node-type="blockContainer"][data-id="${id}"]`,
    )!;

  for (const [type, props] of [
    ["paragraph", {}],
    ["heading", {}],
    ["toggleListItem", {}],
    ["heading", { isToggleable: true }],
  ] as const) {
    it(`puts them on a ${type} ${JSON.stringify(props)} and follows changes`, async ({
      setupEditor,
    }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [
          {
            id: "parent",
            type,
            props: { ...props, textColor: "red" },
            content: "Parent",
            children: [{ id: "child", type: "paragraph", content: "Child" }],
          },
        ],
      });
      const element = () => blockElement(editor, "parent");
      expect(element().getAttribute("data-text-color")).toBe("red");
      expect(element().hasAttribute("data-background-color")).toBe(false);

      editor.updateBlock("parent", {
        props: { textColor: "default", backgroundColor: "blue" },
      });
      expect(element().hasAttribute("data-text-color")).toBe(false);
      expect(element().getAttribute("data-background-color")).toBe("blue");
    });
  }
});

// As with ProseMirror's default, a change of the block's type keeps its view
// (and its children's), unless the new type draws a frame or the old one did.
describe("block type changes", () => {
  const it = globalThis.it.extend<{
    parentFixture: {
      editor: BlockNoteEditor;
      element: (id: string) => Element | null;
    };
  }>({
    parentFixture: async ({ setupEditor }, use) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [
          {
            id: "parent",
            type: "paragraph",
            content: "Parent",
            children: [{ id: "child", type: "paragraph", content: "Child" }],
          },
        ],
      });
      const element = (id: string) =>
        editor.domElement!.querySelector(
          `[data-node-type="blockContainer"][data-id="${id}"]`,
        );
      await use({ editor, element });
    },
  });

  it("keeps the block and its children between types without a frame", ({
    parentFixture: { editor, element },
  }) => {
    const [parent, child] = [element("parent"), element("child")];
    editor.updateBlock("parent", { type: "heading" });
    editor.updateBlock("parent", { type: "bulletListItem" });
    expect(element("parent")).toBe(parent);
    expect(element("child")).toBe(child);
  });

  it("draws the block again when the frame comes or goes", ({
    parentFixture: { editor, element },
  }) => {
    const parent = element("parent");
    editor.updateBlock("parent", { type: "toggleListItem" });
    const toggled = element("parent")!;
    expect(toggled).not.toBe(parent);
    expect(toggled.querySelector(".bn-toggle-frame")).not.toBeNull();

    editor.updateBlock("parent", { type: "paragraph" });
    expect(element("parent")).not.toBe(toggled);
    expect(element("parent")!.querySelector(".bn-toggle-frame")).toBeNull();
    expect(element("parent")!.textContent).toContain("Child");
  });
});
