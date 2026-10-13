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
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
} from "../../utils/const.js";
import { browserName, page, userEvent } from "../../utils/context.js";
import { sleep, waitForSelector } from "../../utils/editor.js";
import {
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

const DROP_CURSOR_SELECTOR = '[class*="prosemirror-dropcursor"]';

/** An element of the toggle itself, not of a toggle nested in it. */
async function ownElement(selector: string) {
  const block = await waitForSelector(`.bn-block[data-id="t"]`);
  const element = [...block.querySelectorAll(selector)].find(
    (candidate) => candidate.closest(".bn-block") === block,
  );
  if (!element) {
    throw new Error(`The toggle has no ${selector}`);
  }
  return element;
}

/**
 * Drags block `drag` by its handle to the center of `target`, and holds it
 * there. `mouseSequence([{ type: "up" }])` drops it.
 */
async function dragOnto(target: Element) {
  // Not `getByText`: a previous drag leaves its drag image, a copy of the
  // dragged block, in the document.
  await moveMouseOverElement(
    await waitForSelector(`.bn-block[data-id="drag"] .bn-inline-content`),
  );
  const handle = getRect(await waitForSelector(DRAG_HANDLE_SELECTOR));
  const rect = getRect(target);
  // The pauses let the browser start the drag, as in `dragAndDropBlock`.
  await mouseSequence([
    {
      type: "move",
      x: handle.x + handle.width / 2,
      y: handle.y + handle.height / 2,
      steps: 5,
    },
  ]);
  await sleep(100);
  await mouseSequence([{ type: "down" }]);
  await sleep(100);
  await mouseSequence([
    {
      type: "move",
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      steps: 5,
    },
  ]);
}

async function dropCursorTop() {
  return getRect(await waitForSelector(DROP_CURSOR_SELECTOR)).top;
}

describe.each(kinds)("$name", ({ toggle }) => {
  // BLO-956: the only way to drop a block into an empty toggle is onto the
  // toggle itself, e.g. its "Add block" button. This test uses a real mouse
  // drag, which Playwright only emulates reliably in Chromium. All drop
  // targets are tested in every browser in `toggleBlocks.browser.test.ts`,
  // with synthetic drag events.
  describe.skipIf(browserName !== "chromium")("drop onto the toggle", () => {
    test("onto 'Add block', into the empty toggle (BLO-956)", async () => {
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

      await dragOnto(await ownElement(".bn-toggle-add-block-button"));
      // The drop cursor shows the place of the children: below the title.
      const title = getRect(await ownElement(".bn-block-content"));
      await expect.poll(dropCursorTop).toBeGreaterThan(title.bottom - 6);
      expect(await dropCursorTop()).toBeLessThan(title.bottom + 6);

      await mouseSequence([{ type: "up" }]);

      // The drop cursor does not stay after the drop.
      await expect
        .poll(() => document.querySelector(DROP_CURSOR_SELECTOR))
        .toBeNull();
      expect(editor.getBlock("t")!.children.map((child) => child.id)).toEqual([
        "drag",
      ]);
    });
  });

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
