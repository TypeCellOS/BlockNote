import { DRAG_HANDLE_SELECTOR } from "../../utils/const.js";
import {
  getRect,
  mouseSequence,
  moveMouseOverElement,
} from "../../utils/mouse.js";
import { browserName } from "../../utils/context.js";
import { sleep } from "../../utils/editor.js";
import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { afterEach, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { page, userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

const editors: BlockNoteEditor[] = [];
const unmountViews: (() => Promise<void>)[] = [];

async function mount(initialContent: PartialBlock[]) {
  window.localStorage.clear();
  const editor = BlockNoteEditor.create({ initialContent });
  editors.push(editor);
  const rendered = await render(<BlockNoteView editor={editor} />);
  unmountViews.push(() => rendered.unmount());
  await waitForSelector(".bn-toggle-frame");
  return editor;
}

function frame(id: string) {
  return document.querySelector<HTMLElement>(
    `[data-id="${id}"] > .bn-block > .bn-toggle-frame`,
  )!;
}

function button(element: HTMLElement) {
  return page.elementLocator(
    element.querySelector<HTMLButtonElement>(":scope > .bn-toggle-button")!,
  );
}

afterEach(async () => {
  for (const unmount of unmountViews.splice(0)) {
    await unmount();
  }
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
  window.localStorage.clear();
});

test("real pointer clicks reach nested toggles beside the side menu", async () => {
  const editor = await mount([
    {
      id: "parent",
      type: "toggleListItem",
      content: "Parent",
      children: [
        {
          id: "nested",
          type: "heading",
          props: { level: 2, isToggleable: true },
          content: "Nested heading",
          children: [
            { id: "body", type: "paragraph", content: "Editable body" },
          ],
        },
      ],
    },
  ]);
  const outer = frame("parent");
  await button(outer).click();
  const nested = frame("nested");
  await button(nested).click();
  const childDOM = document.querySelector('[data-id="body"]');
  editor.setTextCursorPosition("body", "end");
  editor.focus();
  await userEvent.keyboard(" edited");
  const before = editor.document;
  await button(outer).click();
  expect(nested.getClientRects()).toHaveLength(0);
  await button(outer).click();
  expect(nested.getClientRects().length).toBeGreaterThan(0);
  expect(document.querySelector('[data-id="body"]')).toBe(childDOM);
  expect(editor.document).toEqual(before);
  expect(editor.getBlock("body")!.content).toEqual([
    { type: "text", text: "Editable body edited", styles: {} },
  ]);
  // Check the whole clickable area, not just the center of the chevron.
  await button(nested).hover();
  const rect = nested.querySelector("button")!.getBoundingClientRect();
  for (const x of [rect.left + 1, rect.right - 1]) {
    expect(
      nested
        .querySelector("button")!
        .contains(document.elementFromPoint(x, rect.top + rect.height / 2)),
    ).toBe(true);
  }
});

test("read-only changes hide and restore the empty-state button without remounting", async () => {
  const editor = await mount([
    { id: "empty", type: "toggleListItem", content: "Empty" },
  ]);
  const original = frame("empty");
  await button(original).click();
  const add = original.querySelector<HTMLButtonElement>(
    ".bn-toggle-add-block-button",
  )!;
  expect(getComputedStyle(add).display).not.toBe("none");
  editor.isEditable = false;
  expect(getComputedStyle(add).display).toBe("none");
  editor.isEditable = true;
  expect(frame("empty")).toBe(original);
  await page.elementLocator(add).click();
  expect(editor.getBlock("empty")!.children).toHaveLength(1);
});

test("an empty toggle title does not trap arrow-key navigation", async () => {
  const editor = await mount([
    { id: "empty", type: "toggleListItem" },
    { id: "next", type: "paragraph", content: "Next" },
  ]);
  editor.setTextCursorPosition("empty", "end");
  editor.focus();
  await userEvent.keyboard("{ArrowDown}");
  expect(editor.getTextCursorPosition().block.id).toBe("next");
});

test("Enter creates a child in an expanded toggle heading and undoes once", async () => {
  const editor = await mount([
    {
      id: "heading",
      type: "heading",
      props: { isToggleable: true },
      content: "Heading",
    },
  ]);
  const before = editor.document;
  await button(frame("heading")).click();
  editor.setTextCursorPosition("heading", "end");
  editor.focus();
  await userEvent.keyboard("{Enter}Child");
  expect(editor.getBlock("heading")!.children[0].content).toEqual([
    { type: "text", text: "Child", styles: {} },
  ]);
  editor.undo();
  expect(editor.document).toEqual(before);
});

// Playwright's native drag simulation does not reliably fire dragover in Firefox.
test.skipIf(browserName === "firefox")(
  "drag cursor agrees with dropping into an expanded childless toggle",
  async () => {
    const editor = await mount([
      { id: "toggle", type: "toggleListItem", content: "Toggle" },
      { id: "source", content: "Drag me" },
    ]);
    const before = editor.document;
    await button(frame("toggle")).click();
    await moveMouseOverElement('[data-id="source"] .bn-block-content');
    await sleep(100);
    await moveMouseOverElement(await waitForSelector(DRAG_HANDLE_SELECTOR));
    await sleep(100);
    await mouseSequence([{ type: "down" }]);
    const rect = getRect('[data-id="toggle"] .bn-block-content');
    await mouseSequence([
      {
        type: "move",
        x: rect.left + rect.width / 2,
        y: rect.top + 1,
        steps: 5,
      },
    ]);
    await sleep(300);
    await mouseSequence([
      {
        type: "move",
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        steps: 5,
      },
    ]);
    await sleep(300);
    const cursorRect = getRect(
      await waitForSelector('[class*="prosemirror-dropcursor"]'),
    );
    await mouseSequence([{ type: "up" }]);
    await sleep(300);
    expect(
      editor.getBlock("toggle")!.children.map((child) => child.id),
    ).toEqual(["source"]);
    const childRect = getRect('[data-id="source"]');
    expect(Math.abs(cursorRect.top - childRect.top)).toBeLessThan(16);
    expect(Math.abs(cursorRect.left - childRect.left)).toBeLessThan(32);
    editor.undo();
    expect(editor.document).toEqual(before);
  },
);
