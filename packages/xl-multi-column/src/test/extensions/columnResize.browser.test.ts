import "@blocknote/core/style.css";

import { describe, expect } from "vite-plus/test";

import {
  multiColumnTestOptions,
  type MultiColumnTestEditor,
} from "../setupTestEnv.js";

function hoverColumnBoundary(editor: MultiColumnTestEditor, resize = false) {
  const column = editor.domElement!.querySelector('[data-id="column-0"]')!;
  const rect = column.getBoundingClientRect();
  const clientX = rect.right - 2;
  const event = {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY: rect.top + rect.height / 2,
  };
  column.dispatchEvent(new MouseEvent("mousemove", event));
  expect(column.classList.contains("bn-column-resize-border")).toBe(true);
  if (resize) {
    const down = new MouseEvent("mousedown", event);
    column.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  }
  return () => {
    editor.domElement!.dispatchEvent(
      new MouseEvent("mousemove", { ...event, clientX: clientX + 10 }),
    );
  };
}

function expectBoundary(editor: MultiColumnTestEditor, visible: boolean) {
  expect(!!editor.domElement!.querySelector(".bn-column-resize-border")).toBe(
    visible,
  );
  expect(!!editor.domElement!.querySelector(".bn-column-list-hovered")).toBe(
    visible,
  );
}

describe("Column resize plugin state after doc changes", () => {
  it("falls back to default when a hovered column's removal unwraps the column list", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });

    hoverColumnBoundary(editor);

    // Removing one of the two columns brings the column list below its
    // minimum of 2 children, so it gets unwrapped entirely. This used to
    // throw a RangeError from the plugin's decorations, as they were built
    // from positions resolved against the old, larger doc.
    editor.removeBlocks(["column-1"]);

    expectBoundary(editor, false);
    // The surviving column's two paragraphs are unwrapped to the top level.
    expect(editor.document.map((block) => block.type)).toEqual([
      "paragraph",
      "paragraph",
      "paragraph",
      "paragraph",
      "paragraph",
    ]);
  });

  it("falls back to default when the whole doc is replaced", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });

    hoverColumnBoundary(editor);

    // Mimics select-all + backspace clearing the document while columns are
    // hovered.
    editor.replaceBlocks(editor.document, [{ type: "paragraph" }]);

    expectBoundary(editor, false);
    expect(editor.document).toHaveLength(1);
  });

  it("keeps the hover state when an unrelated block changes", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });

    hoverColumnBoundary(editor);

    editor.updateBlock("paragraph-1", { content: "Updated Paragraph 1" });

    expectBoundary(editor, true);
  });
});

describe.each(["hover-column", "resize"] as const)(
  "%s pair validation",
  (mode) => {
    it.for(["reorder", "separate", "reparent"] as const)(
      "clears the pair after %s",
      async (change, { setupEditor }) => {
        const { editor } = await setupEditor({
          mountType: "dom",
          ...multiColumnTestOptions,
        });
        const movePointer = hoverColumnBoundary(editor, mode === "resize");
        const columns = editor.getBlock("column-list-0")!.children;
        const extra = {
          id: "extra-column",
          type: "column" as const,
          children: [{ type: "paragraph" as const, content: "Extra" }],
        };
        if (change === "reorder") {
          editor.updateBlock("column-list-0", {
            children: [columns[1], columns[0]],
          });
        } else if (change === "separate") {
          editor.updateBlock("column-list-0", {
            children: [columns[0], extra, columns[1]],
          });
        } else {
          editor.replaceBlocks(editor.document, [
            {
              type: "columnList",
              id: "column-list-0",
              children: [columns[0], extra],
            },
            {
              type: "columnList",
              id: "other-list",
              children: [
                columns[1],
                { type: "column", children: [{ type: "paragraph" }] },
              ],
            },
          ]);
        }
        expectBoundary(editor, false);
        const beforeMove = editor.document;
        movePointer();
        expect(editor.document).toEqual(beforeMove);
      },
    );

    it("keeps an adjacent pair after an unrelated edit", async ({
      setupEditor,
    }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...multiColumnTestOptions,
      });
      const movePointer = hoverColumnBoundary(editor, mode === "resize");
      editor.updateBlock("paragraph-1", { content: "Changed" });
      expectBoundary(editor, true);
      const beforeMove = editor.document;
      movePointer();
      if (mode === "resize") {
        expect(editor.document).not.toEqual(beforeMove);
      } else {
        expect(editor.document).toEqual(beforeMove);
      }
    });
  },
);
