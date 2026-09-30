import { afterEach, describe, expect, it } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../../../blocks/defaultBlocks.js";

// Enter at the start of a block keeps the block's identity: its id, and props
// such as a checklist item's checked state, stay with its text (#550).
// Backspace below an empty block follows Notion instead: the text merges into
// the empty block, which keeps its own id, type and props (#3124).

let editor: BlockNoteEditor;
let root: HTMLElement;

function mount(content: PartialBlock[]) {
  root = document.createElement("div");
  document.body.appendChild(root);
  editor = BlockNoteEditor.create({ initialContent: content });
  editor.mount(root);
}

afterEach(() => {
  editor._tiptapEditor.destroy();
  root.remove();
});

async function press(key: string, at: { block: string }) {
  editor.setTextCursorPosition(at.block, "start");
  editor.focus();
  await userEvent.keyboard(`{${key}}`);
}

describe("Enter at the start of a non-empty block", () => {
  it("inserts an empty paragraph above a paragraph, which keeps its id", async () => {
    mount([{ id: "p", type: "paragraph", content: "Text" }]);

    await press("Enter", { block: "p" });

    const [inserted, block] = editor.document;
    expect(inserted.type).toBe("paragraph");
    expect(inserted.content).toEqual([]);
    expect(block.id).toBe("p");
    expect(editor.getTextCursorPosition().block.id).toBe("p");
  });

  it("keeps a checklist item's checked state with its text", async () => {
    mount([
      {
        id: "c",
        type: "checkListItem",
        props: { checked: true },
        content: "Done",
      },
    ]);

    await press("Enter", { block: "c" });

    const [inserted, block] = editor.document;
    expect(inserted.type).toBe("checkListItem");
    expect(inserted.props).toMatchObject({ checked: false });
    expect(block.id).toBe("c");
    expect(block.props).toMatchObject({ checked: true });
  });

  it("inserts an empty paragraph above a heading, which keeps its id and level", async () => {
    mount([
      { id: "h", type: "heading", props: { level: 3 }, content: "Heading" },
    ]);

    await press("Enter", { block: "h" });

    const [inserted, block] = editor.document;
    expect(inserted.type).toBe("paragraph");
    expect(block.id).toBe("h");
    expect(block.props).toMatchObject({ level: 3 });
  });

  it("keeps the block's children with it", async () => {
    mount([
      {
        id: "p",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "c1", type: "paragraph", content: "Child" }],
      },
    ]);

    await press("Enter", { block: "p" });

    const [inserted, block] = editor.document;
    expect(inserted.children).toHaveLength(0);
    expect(block.id).toBe("p");
    expect(block.children.map((child) => child.id)).toEqual(["c1"]);
  });
});

describe("Backspace at the start of a block after an empty block", () => {
  it("merges the text into the empty block, which keeps its id and type", async () => {
    mount([
      { id: "empty", type: "heading", props: { level: 2 } },
      { id: "p", type: "paragraph", content: "Text" },
    ]);

    await press("Backspace", { block: "p" });

    const [block] = editor.document;
    expect(editor.document).toHaveLength(1);
    expect(block.id).toBe("empty");
    expect(block.type).toBe("heading");
    expect(block.content).toEqual([{ type: "text", text: "Text", styles: {} }]);
    expect(editor.getTextCursorPosition().block.id).toBe("empty");
  });
});
