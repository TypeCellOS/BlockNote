import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
} from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createReactBlockSpec, useCreateBlockNote } from "@blocknote/react";
import TestingApp from "@examples/01-basic/testing/src/App";
import PdfFileApp from "@examples/06-custom-schema/04-pdf-file-block/src/App";
import { createRef } from "react";
import { describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import {
  EDITOR_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  IMAGE_SELECTOR,
  PARAGRAPH_SELECTOR,
  PDF_SELECTOR,
} from "../../utils/const.js";
import { browserName, userEvent } from "../../utils/context.js";
import { insertHeading, insertParagraph } from "../../utils/copypaste.js";
import {
  compareDocToSnapshot,
  focusOnEditor,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import {
  dragAndDropBlock,
  dropDraggedBlock,
  getRect,
  mouseSequence,
  startBlockDrag,
} from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

// `expect.element` is augmented against the bare `vitest` module, but vite-plus
// types `expect` from an internal module, so the augmentation doesn't attach.
// Type the accessor locally.
type ElementMatchers = {
  not: { toBeVisible(): Promise<void> };
};
type ElementExpect = (element: Element | null) => ElementMatchers;
const expectElement = (expect as unknown as { element: ElementExpect }).element;

describe("Check Block Dragging Functionality", () => {
  // Playwright doesn't correctly simulate drag events in Firefox.
  test.skipIf(browserName === "firefox")(
    "Should be able to drag & drop non-nested blocks",
    async () => {
      await render(<TestingApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();

      await insertHeading(1);
      await userEvent.keyboard("{Enter}");
      await insertHeading(2);
      await userEvent.keyboard("{Enter}");
      await insertHeading(3);

      await dragAndDropBlock(H_ONE_BLOCK_SELECTOR, H_TWO_BLOCK_SELECTOR, false);

      await compareDocToSnapshot("dragdropsingle");
    },
  );

  test.skipIf(browserName === "firefox")(
    "Should be able to drag & drop nested blocks",
    async () => {
      await render(<TestingApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();

      await insertHeading(1);
      await userEvent.keyboard("{Enter}");
      await insertParagraph();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Tab}");
      await insertHeading(2);
      await userEvent.keyboard("{Enter}");
      await insertParagraph();
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Tab}");
      await insertHeading(3);
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
      await userEvent.keyboard("{Shift>}{Tab}{/Shift}");

      // Dragging first heading into next nested element.
      await dragAndDropBlock(H_ONE_BLOCK_SELECTOR, H_TWO_BLOCK_SELECTOR, true);

      // Dragging second heading into next nested element.
      await dragAndDropBlock(
        H_TWO_BLOCK_SELECTOR,
        H_THREE_BLOCK_SELECTOR,
        true,
      );

      const lastParagraph = document.querySelectorAll(PARAGRAPH_SELECTOR);
      await dragAndDropBlock(
        H_THREE_BLOCK_SELECTOR,
        lastParagraph[lastParagraph.length - 1] as HTMLElement,
        true,
      );

      await compareDocToSnapshot("dragdropnested");
    },
  );

  test.skipIf(browserName === "firefox")(
    "Should be able to drag image",
    async () => {
      await render(<TestingApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await executeSlashCommand("image");
      await userEvent.keyboard("{Escape}");
      const paragraphs = document.querySelectorAll(PARAGRAPH_SELECTOR);
      await userEvent.click(paragraphs[paragraphs.length - 1]);
      await insertHeading(1);

      await dragAndDropBlock(IMAGE_SELECTOR, H_ONE_BLOCK_SELECTOR, false);

      await compareDocToSnapshot("dragImage");
    },
  );

  test.skipIf(browserName === "firefox")(
    "Formatting toolbar should not appear when dragging image block",
    async () => {
      await render(<TestingApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await executeSlashCommand("image");
      await userEvent.keyboard("{Escape}");
      const paragraphs = document.querySelectorAll(PARAGRAPH_SELECTOR);
      await userEvent.click(paragraphs[paragraphs.length - 1]);
      await insertHeading(1);

      await dragAndDropBlock(IMAGE_SELECTOR, H_ONE_BLOCK_SELECTOR, false);

      await expectElement(
        document.querySelector(".bn-formatting-toolbar"),
      ).not.toBeVisible();
    },
  );

  test.skipIf(browserName === "firefox")(
    "Should be able to drag PDF block",
    async () => {
      await render(<PdfFileApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await waitForSelector(PDF_SELECTOR);

      const firstParagraph = document.querySelector(
        PARAGRAPH_SELECTOR,
      ) as HTMLElement;
      await dragAndDropBlock(PDF_SELECTOR, firstParagraph, false);

      await compareDocToSnapshot("dragPdf");
    },
  );

  test.skipIf(browserName === "firefox")(
    "keeps the dropped block visible when the previous selection is offscreen",
    async () => {
      const editor = BlockNoteEditor.create({
        initialContent: Array.from({ length: 70 }, (_, index) => ({
          id: `paragraph-${index}`,
          type: "paragraph",
          content: `Paragraph ${index}`,
        })),
      });
      const scrollRef = createRef<HTMLDivElement>();
      await render(
        <div
          ref={scrollRef}
          style={{ height: 300, width: 600, overflowY: "auto" }}
        >
          <BlockNoteView editor={editor} />
        </div>,
      );
      const scroller = scrollRef.current!;
      const selectedBlock = await waitForSelector('[data-id="paragraph-0"]');
      const source = await waitForSelector('[data-id="paragraph-60"]');
      const destination = await waitForSelector('[data-id="paragraph-62"]');
      editor.setTextCursorPosition("paragraph-0", "start");
      editor.focus();

      // Keep the native selection near the start while scrolling to later blocks.
      // Refocusing on drop must not scroll back to that old selection.
      scroller.scrollTop +=
        source.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        80;
      expect(selectedBlock.getBoundingClientRect().bottom).toBeLessThan(
        scroller.getBoundingClientRect().top,
      );
      expect(editor.getTextCursorPosition().block.id).toBe("paragraph-0");

      await dragAndDropBlock(source, destination, false);

      await expect
        .poll(() => {
          const ids = editor.document.map((block) => block.id);
          return ids[ids.indexOf("paragraph-62") + 1];
        })
        .toBe("paragraph-60");
      await expect
        .poll(() => {
          const moved = scroller.querySelector('[data-id="paragraph-60"]');
          if (!moved) {
            return false;
          }
          const blockRect = moved.getBoundingClientRect();
          const viewport = scroller.getBoundingClientRect();
          return (
            blockRect.top >= viewport.top && blockRect.bottom <= viewport.bottom
          );
        })
        .toBe(true);
    },
  );
});

// Dragging layout blocks by their drag handle: the drag preview shows the
// dragged block, and a drop places the dragged block itself, not a new copy
// of its parent around it.

/**
 * A layout block's frame: a label (chrome) above the slot. The drag handle of the
 * layout block shows when the mouse is on its chrome.
 */
function labelledFrame(label: string) {
  const dom = document.createElement("section");
  dom.style.border = "1px solid gray";
  dom.style.padding = "8px";
  const chrome = document.createElement("div");
  chrome.className = "label";
  chrome.contentEditable = "false";
  chrome.textContent = label;
  const slot = document.createElement("div");
  dom.append(chrome, slot);
  return { dom, slot };
}

// A React layout block: React wraps its frame in elements of its own.
const createReactPanel = createReactBlockSpec(
  { type: "reactPanel", propSchema: {}, content: "none", layoutOnly: true },
  {
    renderFrame: (props) => (
      <section style={{ border: "1px solid gray", padding: 8 }}>
        <div className="label" contentEditable={false}>
          React panel
        </div>
        <div ref={props.slotRef} />
      </section>
    ),
  },
);

// A list of items. An item is placed only in a list (`namedOnly`), and it
// keeps its drag handle (`draggable`), like the steps of a stepper.
const Item = createBlockSpec(
  {
    type: "item",
    propSchema: {},
    content: "none",
    layoutOnly: true,
    placeable: "namedOnly",
  },
  {
    meta: { draggable: true },
    renderFrame: () => labelledFrame("Item"),
  },
);

const List = createBlockSpec(
  {
    type: "list",
    propSchema: {},
    content: "none",
    layoutOnly: true,
    children: { allow: ["item"], min: 1 },
  },
  {
    renderFrame: () => {
      const dom = document.createElement("div");
      return { dom, slot: dom };
    },
  },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    reactPanel: createReactPanel(),
    item: Item(),
    list: List(),
  },
});

const item = (id: string, text: string) => ({
  id,
  type: "item",
  children: [{ type: "paragraph", content: text }],
});

const editors: BlockNoteEditor<any, any, any>[] = [];

function Editor(props: { initialContent: any[] }) {
  const editor = useCreateBlockNote({
    schema,
    initialContent: props.initialContent,
  });
  editors.push(editor as any);
  return <BlockNoteView editor={editor} />;
}

async function renderEditors(...documents: any[][]) {
  editors.length = 0;
  await render(
    <div>
      {documents.map((initialContent, index) => (
        <Editor key={index} initialContent={initialContent} />
      ))}
    </div>,
  );
  await waitForSelector(EDITOR_SELECTOR);
  await sleep(100);
}

/** The element of the block with the ID. */
function block(id: string) {
  return document.querySelector(`[data-id="${id}"]`)!;
}

/**
 * Where the mouse picks the block with the ID: the chrome of a layout block, or
 * else the block's element.
 */
function handleOf(id: string) {
  return block(id).querySelector(":scope > .label") ?? block(id);
}

/** The IDs of the blocks. */
function ids(blocks: any[]) {
  return blocks.map((block) => block.id);
}

/** The number of `list` blocks in a block tree. */
function lists(blocks: any[]): number {
  return blocks.reduce(
    (count, block) =>
      count + (block.type === "list" ? 1 : 0) + lists(block.children),
    0,
  );
}

// Playwright doesn't correctly simulate drag events in Firefox.
describe.skipIf(browserName === "firefox")("Dragging layout blocks", () => {
  test.each([
    { name: "a React layout block", id: "reactPanel", text: "In React" },
    {
      name: "a block in a React layout block",
      id: "inReact",
      text: "In React",
    },
  ])("shows $name in the drag preview", async ({ id, text }) => {
    await renderEditors([
      {
        id: "reactPanel",
        type: "reactPanel",
        children: [{ id: "inReact", type: "paragraph", content: "In React" }],
      },
    ]);

    await startBlockDrag(handleOf(id));
    try {
      const preview = await waitForSelector(".bn-drag-preview");
      expect(preview.textContent).toContain(text);
      const { width, height } = preview.getBoundingClientRect();
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    } finally {
      // Releases the mouse also when a check fails, for the next tests.
      await dropDraggedBlock(block(id), true);
    }
  });

  test("moves a namedOnly layout block in its list, without a copy of the list", async () => {
    await renderEditors([
      {
        id: "list",
        type: "list",
        children: [item("i1", "One"), item("i2", "Two"), item("i3", "Three")],
      },
    ]);

    await dragAndDropBlock(handleOf("i1"), handleOf("i3"), true);
    await sleep(100);

    // The item moved: the list holds the same items, and no new list.
    expect(lists(editors[0].document)).toBe(1);
    expect(ids(editors[0].document[0].children)).toEqual(["i2", "i1", "i3"]);
  });

  test("moves a namedOnly layout block into a list of another editor", async () => {
    await renderEditors(
      [
        {
          id: "list",
          type: "list",
          children: [item("i1", "One"), item("i2", "Two")],
        },
      ],
      [{ id: "list2", type: "list", children: [item("j1", "Uno")] }],
    );

    await dragAndDropBlock(handleOf("i1"), handleOf("j1"), true);
    await sleep(100);

    expect(ids(editors[0].document[0].children)).toEqual(["i2"]);
    // The item moved into the other list, without a new list around it.
    expect(lists(editors[1].document)).toBe(1);
    expect(editors[1].document[0].children).toHaveLength(2);
    expect(
      editors[1].document[0].children.map((child: any) => child.type),
    ).toEqual(["item", "item"]);
  });
});

// Playwright doesn't correctly simulate drag events in Firefox.
describe.skipIf(browserName === "firefox")("Dropping into a block", () => {
  // The highlight of the toggle used to be set on its element directly, which
  // ProseMirror read back as a DOM change and drew the toggle again: the
  // browser then dropped the drag without a `drop` event.
  test("drops a block onto a closed toggle as its first child", async () => {
    await renderEditors([
      { id: "toggle", type: "toggleListItem", content: "Toggle" },
      { id: "dragged", type: "paragraph", content: "Dragged" },
    ]);

    await startBlockDrag(block("dragged"));
    const target = getRect(block("toggle").querySelector(".bn-block-content")!);
    await mouseSequence([
      {
        type: "move",
        x: target.x + target.width / 2,
        y: target.y + target.height / 2,
        steps: 5,
      },
    ]);
    // Hovers before the drop, as a user does, which gave ProseMirror the time
    // to draw the toggle again.
    await sleep(200);
    await mouseSequence([{ type: "up" }]);
    await sleep(100);

    expect(ids(editors[0].document)).toEqual(["toggle"]);
    expect(ids(editors[0].document[0].children)).toEqual(["dragged"]);
  });
});
