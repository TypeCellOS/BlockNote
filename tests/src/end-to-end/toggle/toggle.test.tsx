import TestingApp from "@examples/01-basic/testing/src/App";
import { describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import {
  DOC_TRAILING_BLOCK_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import { browserName, userEvent } from "../../utils/context.js";
import { focusOnEditor, sleep, waitForSelector } from "../../utils/editor.js";
import { getRect, mouseSequence } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

const TOGGLE_SELECTOR = `[data-content-type="toggleListItem"]`;
const COLLAPSE_BUTTON_SELECTOR = `.bn-collapse-button`;
const ADD_BLOCK_BUTTON_SELECTOR = `.bn-collapse-add-block-button`;
const DROP_CURSOR_SELECTOR = `[class*="prosemirror-dropcursor"]`;

/** The editor under test. Only `window.ProseMirror` is exposed globally. */
function blockNoteEditor() {
  return (window as any).ProseMirror.view.state.schema.cached.blockNoteEditor;
}

/** The text of the block the selection is currently in. */
function selectedBlockText(): string | undefined {
  const { $from } = (window as any).ProseMirror.view.state.selection;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "blockContainer") {
      return node.firstChild?.textContent;
    }
  }

  return undefined;
}

/** The editor's blocks, as a tree of `{ text, children }`. */
function blockTree() {
  type Entry = { text: string; children: Entry[] };

  const walk = (group: any, into: Entry[]) => {
    group.forEach((container: any) => {
      const entry: Entry = {
        text: container.firstChild.textContent,
        children: [],
      };
      into.push(entry);

      const childGroup = container.maybeChild(1);
      if (childGroup) {
        walk(childGroup, entry.children);
      }
    });
  };

  const blocks: Entry[] = [];
  walk((window as any).ProseMirror.state.doc.firstChild, blocks);

  return blocks;
}

/**
 * Creates a toggle list item holding `title` as the first block, expanded and
 * with no children, followed by a paragraph holding `nextBlockText`.
 */
async function createExpandedEmptyToggle(title: string, nextBlockText: string) {
  await render(<TestingApp />);
  await waitForSelector(EDITOR_SELECTOR);
  await focusOnEditor();

  await executeSlashCommand("Toggle List");
  await userEvent.keyboard(title);

  await userEvent.click(await waitForSelector(DOC_TRAILING_BLOCK_SELECTOR));
  await userEvent.keyboard(nextBlockText);
  await sleep(100);

  await userEvent.click(await waitForSelector(COLLAPSE_BUTTON_SELECTOR));
  await waitForSelector(ADD_BLOCK_BUTTON_SELECTOR);
}

describe("Toggle blocks", () => {
  // #2109 (comment) — the "add a block" affordance used to swallow the caret,
  // so ArrowDown out of an expanded empty toggle did nothing.
  test("ArrowDown moves out of an expanded empty toggle", async () => {
    await createExpandedEmptyToggle("Toggle", "After");

    // Puts the caret at the end of the toggle's title.
    await userEvent.click(await waitForSelector(TOGGLE_SELECTOR));
    await sleep(100);
    expect(selectedBlockText()).toBe("Toggle");

    await userEvent.keyboard("{ArrowDown}");
    await sleep(100);

    expect(selectedBlockText()).toBe("After");
  });

  // #2109 — Playwright doesn't correctly simulate drag events in Firefox.
  test.skipIf(browserName === "firefox")(
    "a block dragged onto an expanded childless toggle becomes its child, where the drop cursor showed",
    async () => {
      await createExpandedEmptyToggle("Toggle", "Drag me");

      const paragraphRect = getRect(await waitForSelector(PARAGRAPH_SELECTOR));

      // Reveal the paragraph's drag handle, then pick it up.
      await mouseSequence([
        {
          type: "move",
          x: paragraphRect.x + paragraphRect.width / 2,
          y: paragraphRect.y + paragraphRect.height / 2,
          steps: 5,
        },
      ]);
      await sleep(100);

      const handleRect = getRect(await waitForSelector(DRAG_HANDLE_SELECTOR));
      await mouseSequence([
        {
          type: "move",
          x: handleRect.x + handleRect.width / 2,
          y: handleRect.y + handleRect.height / 2,
          steps: 5,
        },
      ]);
      await sleep(100);
      await mouseSequence([{ type: "down" }]);
      await sleep(100);

      const toggleRect = getRect(await waitForSelector(TOGGLE_SELECTOR));
      const centreX = toggleRect.x + toggleRect.width / 2;

      // Two moves, because the first one after the button goes down starts the
      // drag rather than producing a `dragover`. Both land inside the toggle's
      // own content, so they resolve to the same drop target.
      await mouseSequence([
        { type: "move", x: centreX, y: toggleRect.y + 1, steps: 5 },
      ]);
      await sleep(300);
      await mouseSequence([
        {
          type: "move",
          x: centreX,
          y: toggleRect.y + toggleRect.height / 2,
          steps: 5,
        },
      ]);
      await sleep(300);

      const dropCursorRect = getRect(
        await waitForSelector(DROP_CURSOR_SELECTOR),
      );

      await mouseSequence([{ type: "up" }]);
      await sleep(300);

      expect(blockTree()).toEqual([
        { text: "Toggle", children: [{ text: "Drag me", children: [] }] },
      ]);

      // The drop cursor has to have been drawn where the block actually
      // landed, or the drag would have lied about the outcome.
      const childRect = getRect(PARAGRAPH_SELECTOR);
      expect(Math.abs(dropCursorRect.top - childRect.top)).toBeLessThan(16);
      expect(Math.abs(dropCursorRect.left - childRect.left)).toBeLessThan(32);

      // The drop is one transaction, so one undo takes the block back out.
      blockNoteEditor().undo();
      await sleep(200);

      expect(blockTree()).toEqual([
        { text: "Toggle", children: [] },
        { text: "Drag me", children: [] },
      ]);
    },
  );
});
