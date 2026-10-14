import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { expect, onTestFinished, test } from "vite-plus/test";
import { withMultiColumn } from "../../blocks/schema.js";

function createHoveredColumns() {
  const element = document.createElement("div");
  document.body.append(element);
  const editor = BlockNoteEditor.create({
    schema: withMultiColumn(BlockNoteSchema.create()),
    // These tests exercise column decorations; jsdom cannot hit-test the menu.
    disableExtensions: ["sideMenu"],
    initialContent: [
      { type: "paragraph", content: "Before the columns" },
      {
        id: "columns",
        type: "columnList",
        children: [
          {
            id: "left",
            type: "column",
            children: [{ type: "paragraph", content: "Left column" }],
          },
          {
            id: "right",
            type: "column",
            children: [{ type: "paragraph", content: "Right column" }],
          },
        ],
      },
    ],
  });
  editor.mount(element);
  onTestFinished(() => {
    editor._tiptapEditor.destroy();
    element.remove();
  });

  const column = element.querySelector('[data-id="left"]');
  expect(column).not.toBeNull();
  // Pass the 20px left margin of jsdom's zero-width rectangle to hover the
  // right boundary of the first column.
  column!.dispatchEvent(
    new MouseEvent("mousemove", { bubbles: true, clientX: 21 }),
  );
  expect(column!.classList.contains("bn-column-resize-border")).toBe(true);

  return { editor, element };
}

test("removing hovered columns clears their decorations", () => {
  const { editor, element } = createHoveredColumns();

  editor.replaceBlocks(editor.document, [{ type: "paragraph" }]);

  expect(element.querySelector(".bn-column-list-hovered")).toBeNull();
  expect(element.querySelector(".bn-column-resize-border")).toBeNull();
});

test("column hover decorations follow columns when their positions change", () => {
  const { editor, element } = createHoveredColumns();

  editor.insertBlocks(
    [{ type: "paragraph", content: "Inserted before the hovered columns" }],
    editor.document[0],
    "before",
  );

  expect(
    element.querySelector(".bn-column-list-hovered")?.getAttribute("data-id"),
  ).toBe("columns");
  expect(
    element.querySelector(".bn-column-resize-border")?.getAttribute("data-id"),
  ).toBe("left");
});
