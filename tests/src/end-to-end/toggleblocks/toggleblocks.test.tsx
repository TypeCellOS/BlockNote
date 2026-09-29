import {
  type BlockNoteEditor,
  BlockNoteSchema,
  type PartialBlock,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import {
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import {
  DRAG_HANDLE_ADD_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import { browserName, page, userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";
import {
  dragAndDropBlock,
  getRect,
  mouseSequence,
  moveMouseOverElement,
} from "../../utils/mouse.js";

// UI behaviour of the built-in toggle blocks (toggle heading and toggle list
// item) that needs the full editor view: drag and drop, the side menu and the
// placeholder. Keyboard and open-state behaviour is covered by
// `packages/core/src/blocks/ToggleWrapper/toggleBlocks.browser.test.ts`.
// Tests for bugs that are still open use `test.fails`: they state the
// expected behaviour, so they start failing - and must be switched to `test`
// - once the bug is fixed.

const schema = withMultiColumn(BlockNoteSchema.create());

let editor: BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

function ToggleApp(props: { content: PartialBlock<any>[]; width?: number }) {
  editor = useCreateBlockNote({
    schema,
    dropCursor: multiColumnDropCursor,
    initialContent: props.content,
  });

  return (
    <div style={{ width: props.width }}>
      <BlockNoteView editor={editor} />
    </div>
  );
}

const kinds = [
  {
    name: "toggle heading",
    toggle: (children: PartialBlock<any>[] = []): PartialBlock<any> => ({
      id: "t",
      type: "heading",
      props: { level: 2, isToggleable: true },
      content: "Toggle",
      children,
    }),
  },
  {
    name: "toggle list item",
    toggle: (children: PartialBlock<any>[] = []): PartialBlock<any> => ({
      id: "t",
      type: "toggleListItem",
      content: "Toggle",
      children,
    }),
  },
];

beforeEach(() => {
  // The open state of a toggle is kept in `localStorage`, keyed by block id.
  localStorage.clear();
});

async function openToggle() {
  const block = document.querySelector(`.bn-block[data-id="t"]`)!;
  const button = [...block.querySelectorAll(".bn-toggle-button")].find(
    (element) => element.closest(".bn-block") === block,
  );
  if (!button) {
    throw new Error("The toggle has no chevron");
  }
  await userEvent.click(button);
}

describe.each(kinds)("$name", ({ toggle }) => {
  // BLO-956: an empty toggle has no place to drop a block into. The only way
  // to fill it is to click "Add block" first.
  test
    .skipIf(browserName === "firefox")
    .fails(
      "accepts a block dropped into it while it is open and empty (BLO-956)",
      async () => {
        await render(
          <ToggleApp
            content={[
              toggle(),
              { id: "drag", type: "paragraph", content: "Drag me" },
            ]}
          />,
        );
        await waitForSelector(EDITOR_SELECTOR);
        await openToggle();

        await dragAndDropBlock(
          page.getByText("Drag me").element(),
          await waitForSelector(
            `.bn-block[data-id="t"] .bn-toggle-add-block-button`,
          ),
          true,
        );

        expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual(
          ["drag"],
        );
      },
    );

  // BLO-1030: the side menu of a block in the left column of a column list
  // inside a toggle was reported to disappear when the mouse moves onto it.
  // This did not reproduce here (on `main` either), in any browser. The test
  // keeps the behaviour the issue asks for.
  test("keeps the side menu of a block in a column usable (BLO-1030)", async () => {
    await render(
      <ToggleApp
        content={[
          toggle([
            {
              type: "columnList",
              children: [
                {
                  type: "column",
                  children: [
                    { id: "left", type: "paragraph", content: "Left" },
                  ],
                },
                {
                  type: "column",
                  children: [
                    { id: "right", type: "paragraph", content: "Right" },
                  ],
                },
              ],
            },
          ]),
        ]}
      />,
    );
    await waitForSelector(EDITOR_SELECTOR);
    await openToggle();

    await moveMouseOverElement(page.getByText("Left").element());
    const add = getRect(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    await mouseSequence([
      {
        type: "move",
        x: add.x + add.width / 2,
        y: add.y + add.height / 2,
        steps: 10,
      },
    ]);
    await userEvent.click(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));

    const leftColumn = editor.getParentBlock("left")!;
    expect(leftColumn.children).toHaveLength(2);
    expect(leftColumn.children[0].id).toBe("left");
  });

  // BLO-967: on a narrow screen, a placeholder that wraps must take up space,
  // so it doesn't overlap the block below it.
  test("gives a wrapping placeholder in its body its own space (BLO-967)", async () => {
    await render(
      <ToggleApp
        width={280}
        content={[
          toggle([
            { id: "filled", type: "paragraph", content: "One line" },
            { id: "empty", type: "paragraph" },
          ]),
          { id: "below", type: "paragraph", content: "Below" },
        ]}
      />,
    );
    await waitForSelector(EDITOR_SELECTOR);
    await openToggle();

    // The default placeholder shows in the empty block that has the caret.
    editor.setTextCursorPosition("empty");
    editor.focus();

    const content = (id: string) =>
      getRect(`.bn-block[data-id="${id}"] > .bn-block-content`);
    const oneLine = content("filled").height;
    expect(content("empty").height).toBeGreaterThan(oneLine * 1.5);
    expect(content("below").top).toBeGreaterThanOrEqual(
      content("empty").bottom,
    );
  });
});
