import "@blocknote/core/style.css";

// Exercises the mounted keymap chain, including ProseMirror's DOM boundary checks.
import { describe, expect } from "vite-plus/test";

import { commands } from "../../../../../tests/src/commands/transport.js";
import {
  multiColumnTestOptions,
  type MultiColumnTestEditor,
} from "../setupTestEnv.js";

const it = globalThis.it.extend<{ editor: MultiColumnTestEditor }>({
  editor: async ({ setupEditor }, use) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });
    await use(editor);
  },
});

function pressBackspace(editor: MultiColumnTestEditor) {
  const event = new KeyboardEvent("keydown", {
    key: "Backspace",
    code: "Backspace",
    keyCode: 8,
    bubbles: true,
    cancelable: true,
  });
  editor.domElement!.dispatchEvent(event);
}

function pressDelete(editor: MultiColumnTestEditor) {
  const event = new KeyboardEvent("keydown", {
    key: "Delete",
    code: "Delete",
    keyCode: 46,
    bubbles: true,
    cancelable: true,
  });
  editor.domElement!.dispatchEvent(event);
}

const threeColumnsWithParagraphBelow = [
  {
    type: "columnList" as const,
    children: [
      {
        type: "column" as const,
        children: [
          { id: "col1-para", type: "paragraph" as const, content: "col1" },
        ],
      },
      {
        type: "column" as const,
        children: [
          { id: "col2-para", type: "paragraph" as const, content: "col2" },
        ],
      },
      {
        type: "column" as const,
        children: [
          { id: "col3-para", type: "paragraph" as const, content: "hello" },
        ],
      },
    ],
  },
];

const threeColumnsWithParagraphAbove = [
  {
    type: "columnList" as const,
    children: [
      {
        type: "column" as const,
        children: [
          { id: "col1-para", type: "paragraph" as const, content: "world" },
        ],
      },
      {
        type: "column" as const,
        children: [
          {
            id: "col2-para",
            type: "paragraph" as const,
            content: "universe",
          },
        ],
      },
      {
        type: "column" as const,
        children: [
          { id: "col3-para", type: "paragraph" as const, content: "planet" },
        ],
      },
    ],
  },
];

const columnsOnly = [
  {
    type: "columnList" as const,
    children: [
      {
        type: "column" as const,
        children: [
          { id: "col1-para", type: "paragraph" as const, content: "col1" },
        ],
      },
      {
        type: "column" as const,
        children: [
          { id: "col2-para", type: "paragraph" as const, content: "col2" },
        ],
      },
    ],
  },
];

const columnsWithEmptyFirst = [
  {
    type: "columnList" as const,
    children: [
      {
        type: "column" as const,
        children: [
          { id: "empty-para", type: "paragraph" as const, content: "" },
        ],
      },
      {
        type: "column" as const,
        children: [
          { id: "col2-para", type: "paragraph" as const, content: "col2" },
          { id: "col2-trailing", type: "paragraph" as const, content: "" },
        ],
      },
    ],
  },
];

/** Every bit of text in the document, so a fix can't quietly drop content. */
function texts(editor: MultiColumnTestEditor): string[] {
  const out: string[] = [];
  function walk(blocks: MultiColumnTestEditor["document"]) {
    for (const block of blocks) {
      if (Array.isArray(block.content)) {
        const text = block.content
          .map((content) => (content.type === "text" ? content.text : ""))
          .join("");
        if (text) {
          out.push(text);
        }
      }
      walk(block.children);
    }
  }
  walk(editor.document);
  return out.sort();
}

// A column layout with nothing after it, and one whose first column is empty,
// both used to throw out of the keydown handler: there is no following block
// to pull in, and no non-empty first column to merge with. The document is
// left alone (or repaired) instead.
describe("Delete and Backspace at a column layout's edges", () => {
  it("Delete at the end of the last column, with the layout ending the document", ({
    editor,
  }) => {
    editor.replaceBlocks(editor.document, columnsOnly);

    editor.setTextCursorPosition("col2-para", "end");

    expect(() => pressDelete(editor)).not.toThrow();
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
    expect(texts(editor)).toEqual(["col1", "col2"]);
  });

  it("Delete at the start of an empty first column", ({ editor }) => {
    editor.replaceBlocks(editor.document, columnsWithEmptyFirst);

    editor.setTextCursorPosition("empty-para", "start");

    expect(() => pressDelete(editor)).not.toThrow();
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
    expect(texts(editor)).toEqual(["col2"]);
  });

  it("Delete at the end of a trailing empty block in the last column", ({
    editor,
  }) => {
    editor.replaceBlocks(editor.document, columnsWithEmptyFirst);

    editor.setTextCursorPosition("col2-trailing", "end");

    expect(() => pressDelete(editor)).not.toThrow();
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
    expect(texts(editor)).toEqual(["col2"]);
  });

  it("Backspace at the start of a column following an empty column", ({
    editor,
  }) => {
    editor.replaceBlocks(editor.document, columnsWithEmptyFirst);

    editor.setTextCursorPosition("col2-para", "start");

    expect(() => pressBackspace(editor)).not.toThrow();
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
    expect(texts(editor)).toEqual(["col2"]);
  });
});

describe("Backspace with multi-column", () => {
  // Keep the keymap-only snapshot (native character deletion is not invoked
  // by dispatching a synthetic keyboard event).
  it("mid-text backspace next to columnList should not move block", async ({
    editor,
    selectText,
  }) => {
    editor.replaceBlocks(editor.document, [
      ...threeColumnsWithParagraphBelow,
      {
        id: "below-para",
        type: "paragraph" as const,
        content: "hello world",
      },
    ]);

    // Place cursor at offset 5 (after "hello", mid-text).
    selectText(editor, "hello", { startBlockId: "below-para" }).collapseToEnd();

    pressBackspace(editor);
    expect(editor.document).toMatchSnapshot();

    editor.focus();
    for (let i = 0; i < 5; i++) {
      await commands.pressKey("Backspace");
    }
    await expect
      .poll(() => editor.getBlock("below-para")?.content)
      .toEqual([{ type: "text", text: " world", styles: {} }]);
    expect(editor.document.at(-1)?.id).toBe("below-para");
  });

  it("backspace at block start should move block into last column", ({
    editor,
  }) => {
    editor.replaceBlocks(editor.document, [
      ...threeColumnsWithParagraphBelow,
      { id: "below-para", type: "paragraph" as const, content: " world" },
    ]);

    editor.setTextCursorPosition("below-para", "start");
    pressBackspace(editor);
    expect(editor.document).toMatchSnapshot();
  });

  it("second backspace should merge into previous block in column", ({
    editor,
  }) => {
    editor.replaceBlocks(editor.document, [
      ...threeColumnsWithParagraphBelow,
      { id: "below-para", type: "paragraph" as const, content: " world" },
    ]);

    editor.setTextCursorPosition("below-para", "start");
    pressBackspace(editor);
    pressBackspace(editor);
    expect(editor.document).toMatchSnapshot();
  });
});

describe("Delete with multi-column", () => {
  // Keep the keymap-only snapshot (native character deletion is not invoked
  // by dispatching a synthetic keyboard event).
  it("mid-text delete next to columnList should not move block", async ({
    editor,
    selectText,
  }) => {
    editor.replaceBlocks(editor.document, [
      {
        id: "above-para",
        type: "paragraph" as const,
        content: "hello world",
      },
      ...threeColumnsWithParagraphAbove,
    ]);

    // Place cursor at offset 6 (after "hello ", mid-text).
    selectText(editor, "world", {
      startBlockId: "above-para",
    }).collapseToStart();

    pressDelete(editor);
    expect(editor.document).toMatchSnapshot();

    editor.focus();
    for (let i = 0; i < 5; i++) {
      await commands.pressKey("Delete");
    }
    await expect
      .poll(() => editor.getBlock("above-para")?.content)
      .toEqual([{ type: "text", text: "hello ", styles: {} }]);
    expect(editor.document[0]?.id).toBe("above-para");
  });

  it("delete at block end should move first column block out", ({ editor }) => {
    editor.replaceBlocks(editor.document, [
      { id: "above-para", type: "paragraph" as const, content: "hello " },
      ...threeColumnsWithParagraphAbove,
    ]);

    editor.setTextCursorPosition("above-para", "end");
    pressDelete(editor);
    expect(editor.document).toMatchSnapshot();
  });

  it("second delete should merge first column block into paragraph", ({
    editor,
  }) => {
    editor.replaceBlocks(editor.document, [
      { id: "above-para", type: "paragraph" as const, content: "hello " },
      ...threeColumnsWithParagraphAbove,
    ]);

    editor.setTextCursorPosition("above-para", "end");
    pressDelete(editor);
    pressDelete(editor);
    expect(editor.document).toMatchSnapshot();
  });
});

describe("Backspace at the start of a column's first block", () => {
  // Left column A1 + A2, right column B1, caret at the start of B1. The block
  // leaves the column list, which dissolves into its blocks, and the caret
  // stays at the start of the block (#3104 unwraps the list in place).
  it("moves the block out, dissolves the list, and keeps the caret", ({
    editor,
  }) => {
    editor.replaceBlocks(editor.document, [
      {
        type: "columnList",
        id: "cl-0",
        children: [
          {
            type: "column",
            id: "col-1",
            children: [
              { id: "A1", type: "paragraph", content: "A1" },
              { id: "A2", type: "paragraph", content: "A2" },
            ],
          },
          {
            type: "column",
            id: "col-2",
            children: [{ id: "B1", type: "paragraph", content: "B1" }],
          },
        ],
      },
      { id: "after", type: "paragraph", content: "after" },
    ]);

    editor.setTextCursorPosition("B1", "start");
    pressBackspace(editor);

    expect(editor.document.map((block) => block.id)).toEqual([
      "A1",
      "A2",
      "B1",
      "after",
    ]);
    expect(editor.document.every((block) => block.type === "paragraph")).toBe(
      true,
    );
    expect(editor.getTextCursorPosition().block.id).toBe("B1");
    expect(editor.getSelection()).toBeUndefined();
    const blockBefore = editor.getBlock("B1");
    expect(blockBefore?.type).toBe("paragraph");
    editor.insertInlineContent("!");
    expect(editor.getBlock("B1")?.content).toMatchObject([
      { type: "text", text: "!B1" },
    ]);
  });
});
