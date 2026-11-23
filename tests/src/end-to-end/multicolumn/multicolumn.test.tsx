import { BlockNoteSchema } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import {
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import { describe, expect } from "vite-plus/test";
import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { commands, page, userEvent } from "../../utils/context.js";
import {
  COLUMN_TRAILING_BLOCK_SELECTOR,
  DRAG_HANDLE_SELECTOR,
} from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import {
  getRect,
  mouseSequence,
  moveMouseOverElement,
  waitForDragHandle,
} from "../../utils/mouse.js";

const schema = withMultiColumn(BlockNoteSchema.create());

async function setupColumns(setupEditor: SetupEditor, after?: string) {
  const { editor } = await setupEditor({
    schema,
    dropCursor: multiColumnDropCursor,
    initialContent: [
      { id: "intro", type: "paragraph", content: "Welcome to this demo!" },
      {
        id: "columns",
        type: "columnList",
        children: [
          {
            id: "left",
            type: "column",
            props: { width: 0.8 },
            children: [
              {
                id: "left-text",
                type: "paragraph",
                content: "This paragraph is in a column!",
              },
            ],
          },
          {
            id: "middle",
            type: "column",
            props: { width: 1.4 },
            children: [
              { id: "title", type: "heading", content: "So is this heading!" },
            ],
          },
          {
            id: "right",
            type: "column",
            props: { width: 0.8 },
            children: [
              {
                id: "instruction",
                type: "paragraph",
                content: "You can have multiple blocks in a column too",
              },
              ...[1, 2, 3].map((i) => ({
                id: `item-${i}`,
                type: "bulletListItem" as const,
                content: `Block ${i}`,
              })),
            ],
          },
        ],
      },
      ...(after
        ? [{ id: "after", type: "paragraph" as const, content: after }]
        : []),
    ],
  });
  const [intro, list] = editor.document;
  const [left, middle, right] = list.children;
  return { editor, intro, list, left, middle, right };
}

describe("Check Multi-Column Behaviour", () => {
  it("Check Delete before column", async ({ setupEditor }) => {
    const { editor, intro, list, left, middle, right } =
      await setupColumns(setupEditor);
    editor.focus();
    editor.setTextCursorPosition(middle.children[0], "end");

    await commands.pressKey("Delete");

    const [instruction, ...items] = right.children;
    expect(editor.document).toEqual([
      intro,
      {
        ...list,
        children: [
          left,
          { ...middle, children: [...middle.children, instruction] },
          { ...right, children: items },
        ],
      },
    ]);
  });
  it("Check Delete before column with single block", async ({
    setupEditor,
  }) => {
    const { editor, intro, list, left, middle, right } =
      await setupColumns(setupEditor);
    // The behavior under test is Delete at the column boundary, not hit-testing
    // at the end of the paragraph.
    editor.focus();
    editor.setTextCursorPosition(left.children[0], "end");

    await commands.pressKey("Delete");

    expect(editor.document).toEqual([
      intro,
      {
        ...list,
        children: [
          { ...left, children: [...left.children, ...middle.children] },
          right,
        ],
      },
    ]);
  });
  it("Check Delete before column list", async ({ setupEditor }) => {
    const { editor, intro, list, left, middle, right } =
      await setupColumns(setupEditor);
    editor.setTextCursorPosition(intro, "end");
    editor.focus();

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toEqual([
      intro,
      left.children[0],
      { ...list, children: [middle, right] },
    ]);
  });
  it("Check column borders stay visible when hovering the side menu", async ({
    setupEditor,
  }) => {
    await setupColumns(setupEditor);
    // Hovering a block in a column shows the borders between the columns.
    const heading = page.getByText("So is this heading!").element();
    await moveMouseOverElement(heading);
    await waitForSelector(".bn-column-list-hovered");

    // The borders must stay visible when the mouse moves onto the side menu,
    // which is rendered over the boundary between the first two columns.
    const handle = await waitForDragHandle(heading);
    await moveMouseOverElement(handle.closest(".bn-side-menu")!);
    expect(document.querySelector(".bn-column-list-hovered")).not.toBeNull();
  });
  it("Check resize border hides when hovering a side menu button", async ({
    setupEditor,
  }) => {
    await setupColumns(setupEditor);
    // Hovering a block in a column shows the side menu for it.
    const heading = page.getByText("So is this heading!").element();
    await moveMouseOverElement(heading);
    await waitForDragHandle(heading);

    // Moving the mouse near the boundary between the first two columns shows
    // the resize border on it.
    const headingRect = getRect(heading);
    const columnRect = getRect(heading.closest(".bn-block-column")!);
    await mouseSequence([
      {
        type: "move",
        x: columnRect.x + 5,
        y: headingRect.y + headingRect.height / 2,
        steps: 5,
      },
    ]);
    await waitForSelector(".bn-column-resize-border");

    // Hovering one of the side menu's buttons hides the resize border, as the
    // button is the likelier target there, while the lighter separators
    // between the columns stay visible.
    await moveMouseOverElement(await waitForSelector(DRAG_HANDLE_SELECTOR));
    expect(document.querySelector(".bn-column-resize-border")).toBeNull();
    expect(document.querySelector(".bn-column-list-hovered")).not.toBeNull();
  });
  it("Check clicking a column's trailing block appends a block to the column", async ({
    setupEditor,
  }) => {
    const { editor, intro, list, left, middle, right } =
      await setupColumns(setupEditor);
    await focusOnEditor();

    // The first column is shorter than its siblings, so its trailing block
    // widget fills the leftover space below its last block (#2820).
    await userEvent.click(
      await waitForSelector(COLUMN_TRAILING_BLOCK_SELECTOR),
    );
    await userEvent.keyboard("Inside the column");

    expect(editor.document).toMatchObject([
      intro,
      {
        ...list,
        children: [
          {
            ...left,
            children: [
              ...left.children,
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Inside the column", styles: {} },
                ],
                children: [],
              },
            ],
          },
          middle,
          right,
        ],
      },
    ]);
  });
  it("Check Delete end of column list", async ({ setupEditor }) => {
    const { editor, intro, list, left, middle, right } = await setupColumns(
      setupEditor,
      "Paragraph",
    );
    const appended = editor.document[2];
    editor.setTextCursorPosition(
      right.children[right.children.length - 1],
      "end",
    );
    editor.focus();

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toEqual([
      intro,
      {
        ...list,
        children: [
          left,
          middle,
          { ...right, children: [...right.children, appended] },
        ],
      },
    ]);
  });
});

// Which block the side menu attaches to is resolved from live layout
// (`elementsFromPoint` / `posAtCoords`); the geometry pieces below that are
// unit-tested in `packages/core/src/extensions/SideMenu/
// blockGeometry.browser.test.ts`. This tests the whole path,
// through a real column list. Columns have no drag handles themselves, but
// hovering their gutter must still resolve the child on the hovered row.
describe("Check side menu placement inside a column list", () => {
  /** Vertical centre of a rect, which the menu lines itself up with. */
  const centerY = (rect: DOMRect) => rect.y + rect.height / 2;

  it("Check drag handle resolves the block on the hovered row of a column", async ({
    setupEditor,
  }) => {
    await setupColumns(setupEditor);
    // The last column is the only one holding several blocks, so it's the only
    // place a wrongly resolved block is distinguishable by its row.
    const target = page.getByText("Block 2").element();
    const columnRect = getRect(target.closest(".bn-block-column")!);

    await mouseSequence([
      {
        type: "move",
        x: columnRect.x + 5,
        y: centerY(getRect(target)),
        steps: 5,
      },
    ]);
    const handleRect = getRect(await waitForDragHandle(target));

    expect(handleRect.x).toBeLessThan(getRect(target).x);

    // The handle lines up with the hovered block's row rather than any other
    // block's. This is a stronger check than a pixel tolerance, since every
    // candidate is only a line-height away, and it is what distinguishes
    // this column's blocks from the neighbouring column's.
    const distance = (rect: DOMRect) =>
      Math.abs(centerY(handleRect) - centerY(rect));
    for (const other of ["Block 1", "Block 3", "So is this heading!"]) {
      expect(distance(getRect(target))).toBeLessThan(
        distance(getRect(page.getByText(other).element())),
      );
    }
  });
});
