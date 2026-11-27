import {
  BlockNoteSchema,
  createBlockSpec,
  isDOMNode,
  type PartialBlock,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { createReactBlockSpec } from "@blocknote/react";
import PdfFileApp from "@examples/06-custom-schema/04-pdf-file-block/src/App";
import { describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import {
  BLOCK_CONTAINER_SELECTOR,
  EDITOR_SELECTOR,
  H_ONE_BLOCK_SELECTOR,
  H_THREE_BLOCK_SELECTOR,
  H_TWO_BLOCK_SELECTOR,
  IMAGE_SELECTOR,
  PARAGRAPH_SELECTOR,
  PDF_SELECTOR,
} from "../../utils/const.js";
import { browserName, MOD, userEvent } from "../../utils/context.js";
import {
  focusOnEditor,
  sleep,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";
import {
  dragAndDropBlock,
  getRect,
  mouseSequence,
  startBlockDrag,
} from "../../utils/mouse.js";

// `expect.element` is augmented against the bare `vitest` module, but vite-plus
// types `expect` from an internal module, so the augmentation doesn't attach.
// Type the accessor locally.
type ElementMatchers = {
  toHaveFocus(): Promise<void>;
};
type ElementExpect = (element: Element | null) => ElementMatchers;
const expectElement = (expect as unknown as { element: ElementExpect }).element;

function heading(
  id: string,
  level: 1 | 2 | 3,
  children?: PartialBlock[],
): PartialBlock {
  return {
    id,
    type: "heading",
    props: { level },
    content: "Heading",
    children,
  };
}

const imageDocument: PartialBlock[] = [
  { id: "0", type: "image" },
  heading("1", 1),
];

describe("Check Block Dragging Functionality", () => {
  // Playwright doesn't correctly simulate drag events in Firefox.
  it.skipIf(browserName === "firefox")(
    "Should be able to drag & drop non-nested blocks",
    async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        initialContent: [heading("0", 1), heading("1", 2), heading("2", 3)],
      });
      const [h1, h2, h3] = editor.document;
      editor.setTextCursorPosition("2", "end");
      editor.focus();

      await dragAndDropBlock(H_ONE_BLOCK_SELECTOR, H_TWO_BLOCK_SELECTOR, false);

      expect(editor.document).toEqual([h2, h1, h3]);
    },
  );

  it.skipIf(browserName === "firefox")(
    "Should be able to drag & drop nested blocks",
    async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        initialContent: [
          heading("0", 1),
          {
            id: "1",
            type: "paragraph",
            content: "Paragraph",
            children: [
              heading("2", 2),
              {
                id: "3",
                type: "paragraph",
                content: "Paragraph",
                children: [heading("4", 3)],
              },
            ],
          },
          { id: "5", type: "paragraph" },
        ],
      });
      const [h1, paragraph, last] = editor.document;
      const [h2, childParagraph] = paragraph.children;
      const [h3] = childParagraph.children;
      editor.setTextCursorPosition("5");
      editor.focus();

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

      expect(editor.document).toEqual([
        { ...paragraph, children: [h1, { ...childParagraph, children: [h2] }] },
        h3,
        last,
      ]);
    },
  );

  it.skipIf(browserName === "firefox")(
    "Should be able to drag image",
    async ({ setupEditor }) => {
      const { editor } = await setupEditor({ initialContent: imageDocument });
      const [image, h1] = editor.document;
      editor.setTextCursorPosition("1", "end");
      editor.focus();

      await dragAndDropBlock(IMAGE_SELECTOR, H_ONE_BLOCK_SELECTOR, false);

      expect(editor.document).toEqual([h1, image]);
    },
  );

  it.skipIf(browserName === "firefox")(
    "Formatting toolbar should not appear when dragging image block",
    async ({ setupEditor }) => {
      const { editor } = await setupEditor({ initialContent: imageDocument });
      editor.setTextCursorPosition("1", "end");
      editor.focus();

      const toolbarSelector = ".bn-formatting-toolbar";
      expect(document.querySelector(toolbarSelector)).toBeNull();

      // Observe the whole gesture. Waiting for the toolbar to disappear
      // after mouseup also passes if it was visible throughout the drag.
      let toolbarMounted = false;
      function recordToolbar(records: MutationRecord[]) {
        toolbarMounted ||= records.some((record) =>
          Array.from(record.addedNodes).some(
            (node) =>
              node instanceof Element &&
              (node.matches(toolbarSelector) ||
                node.querySelector(toolbarSelector) !== null),
          ),
        );
      }
      const observer = new MutationObserver(recordToolbar);
      observer.observe(document.body, { childList: true, subtree: true });
      try {
        await dragAndDropBlock(IMAGE_SELECTOR, H_ONE_BLOCK_SELECTOR, false);
        await expect
          .poll(() => editor.document.map((block) => block.id))
          .toEqual(["1", "0"]);
        recordToolbar(observer.takeRecords());
      } finally {
        observer.disconnect();
      }

      expect(toolbarMounted).toBe(false);
      expect(document.querySelector(toolbarSelector)).toBeNull();
    },
  );

  test.skipIf(browserName === "firefox")(
    "releases the dragged PDF block in its original position without losing or duplicating it",
    async () => {
      await render(<PdfFileApp />);
      const editor = await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await waitForSelector(PDF_SELECTOR);

      const firstParagraph = document.querySelector(
        PARAGRAPH_SELECTOR,
      ) as HTMLElement;
      function blockIds() {
        return [...editor.querySelectorAll(BLOCK_CONTAINER_SELECTOR)].map(
          (block) => block.getAttribute("data-id"),
        );
      }
      const idsBefore = blockIds();
      expect(idsBefore).toHaveLength(3);
      expect(idsBefore.every(Boolean)).toBe(true);
      // The PDF already sits just after this paragraph. Verify that a real
      // drop reaches the editor, then check that the PDF is neither lost
      // nor duplicated when dropped back into the same position.
      let dropped = false;
      function recordDrop(event: DragEvent) {
        dropped ||=
          event.isTrusted &&
          isDOMNode(event.target) &&
          firstParagraph.contains(event.target);
      }
      editor.addEventListener("drop", recordDrop, true);
      try {
        await dragAndDropBlock(PDF_SELECTOR, firstParagraph, false);
      } finally {
        editor.removeEventListener("drop", recordDrop, true);
      }
      expect(dropped).toBe(true);
      expect(blockIds()).toEqual(idsBefore);
      const blocks = [
        ...editor.querySelectorAll<HTMLElement>(".bn-block-content"),
      ];
      expect(blocks.map((block) => block.dataset.contentType)).toEqual([
        "paragraph",
        "pdf",
        "paragraph",
      ]);
      expect(blocks[0].textContent).toBe("Welcome to this demo!");
      expect(
        blocks[1]
          .querySelector('embed[type="application/pdf"]')
          ?.getAttribute("src"),
      ).toBe("https://pdfobject.com/pdf/sample.pdf");
      expect(blocks[2].textContent).toBe(
        "Press the '/' key to open the Slash Menu and add another PDF",
      );
    },
  );

  it.skipIf(browserName === "firefox")(
    "keeps the dropped block visible when the previous selection is offscreen",
    async ({ setupEditor }) => {
      const { editor, rootNode } = await setupEditor({
        initialContent: Array.from({ length: 70 }, (_, index) => ({
          id: `paragraph-${index}`,
          type: "paragraph" as const,
          content: `Paragraph ${index}`,
        })),
        outside: ({ children }) => (
          <div style={{ height: 300, width: 600, overflowY: "auto" }}>
            {children}
          </div>
        ),
      });
      const scroller = rootNode.firstElementChild as HTMLElement;
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

function item(id: string, text: string): typeof schema.PartialBlock {
  return {
    id,
    type: "item",
    children: [{ type: "paragraph", content: text }],
  };
}

async function setupLayoutEditors(
  setupEditor: SetupEditor,
  ...documents: (typeof schema.PartialBlock)[][]
) {
  const editors: (typeof schema.BlockNoteEditor)[] = [];
  for (const initialContent of documents) {
    const { editor } = await setupEditor({ schema, initialContent });
    editors.push(editor);
  }
  return editors;
}

/** The element of the block with the ID. */
function block(id: string) {
  return document.querySelector(`[data-id="${id}"]`)!;
}

function expectVisibleBlockSelection(
  editor: typeof schema.BlockNoteEditor,
  blockIds: string[],
) {
  expect(editor.transact((tr) => tr.selection.toJSON().type)).toBe(
    "multiple-node",
  );
  const selection = editor.getSelectionCutBlocks();
  expect(selection.blocks.map((block) => block.id)).toEqual(blockIds);
  expect(selection.blockCutAtStart).toBeUndefined();
  expect(selection.blockCutAtEnd).toBeUndefined();
  expect(
    editor.domElement?.classList.contains("ProseMirror-hideselection"),
  ).toBe(false);

  const nativeSelection = document.getSelection()!;
  expect(nativeSelection.rangeCount).toBe(1);
  expect(nativeSelection.isCollapsed).toBe(false);
  const range = nativeSelection.getRangeAt(0);
  for (const id of blockIds) {
    expect(range.intersectsNode(block(id))).toBe(true);
  }
  expect(range.getBoundingClientRect().height).toBeGreaterThan(0);
}

/**
 * Where the mouse picks the block with the ID: the chrome of a layout block, or
 * else the block's element.
 */
function handleOf(id: string) {
  return block(id).querySelector(":scope > .label") ?? block(id);
}

/** The IDs of the blocks. */
function ids(blocks: { id: string }[]) {
  return blocks.map((block) => block.id);
}

/** The number of `list` blocks in a block tree. */
function lists(blocks: (typeof schema.Block)[]): number {
  return blocks.reduce(
    (count, block) =>
      count + (block.type === "list" ? 1 : 0) + lists(block.children),
    0,
  );
}

// Playwright doesn't correctly simulate drag events in Firefox.
describe.skipIf(browserName === "firefox")("Dragging layout blocks", () => {
  it.for([
    { name: "a React layout block", id: "reactPanel", text: "In React" },
    {
      name: "a block in a React layout block",
      id: "inReact",
      text: "In React",
    },
  ])(
    "shows $name in the drag preview",
    async ({ id, text }, { setupEditor, onTestFinished }) => {
      await setupLayoutEditors(setupEditor, [
        {
          id: "reactPanel",
          type: "reactPanel",
          children: [{ id: "inReact", type: "paragraph", content: "In React" }],
        },
      ]);

      const drag = await startBlockDrag(handleOf(id), onTestFinished);
      const preview = await waitForSelector(".bn-drag-preview");
      expect(preview.textContent).toContain(text);
      const { width, height } = preview.getBoundingClientRect();
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      await drag.drop(block(id), true);
    },
  );

  // The preview is outside the editor, so it copies the editor's theme,
  // classes and width, and app CSS that sizes the editor does not apply.
  it("draws the drag preview like the editor", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const appCSS = document.createElement("style");
    appCSS.textContent = ".bn-editor { min-height: 500px; }";
    document.head.appendChild(appCSS);
    onTestFinished(() => appCSS.remove());
    await setupLayoutEditors(setupEditor, [
      {
        id: "table",
        type: "table",
        content: { type: "tableContent", rows: [{ cells: ["A", "B"] }] },
      },
    ]);

    const drag = await startBlockDrag(handleOf("table"), onTestFinished);
    const preview = await waitForSelector(".bn-drag-preview");
    const copy = preview.querySelector('[data-id="table"]')!;
    expect(copy.getBoundingClientRect().width).toBe(
      block("table").getBoundingClientRect().width,
    );
    expect(preview.getBoundingClientRect().height).toBeLessThan(500);
    expect(getComputedStyle(preview.querySelector("td")!).borderTopStyle).toBe(
      "solid",
    );
    expect(preview.getAttribute("data-color-scheme")).toBe(
      document
        .querySelector(".bn-container")!
        .getAttribute("data-color-scheme"),
    );
    await drag.drop(block("table"), true);
  });

  it("moves a namedOnly layout block in its list, without a copy of the list", async ({
    setupEditor,
  }) => {
    const editors = await setupLayoutEditors(setupEditor, [
      {
        id: "list",
        type: "list",
        children: [item("i1", "One"), item("i2", "Two"), item("i3", "Three")],
      },
    ]);

    await dragAndDropBlock(handleOf("i1"), handleOf("i3"), true);

    // The item moved: the list holds the same items, and no new list.
    await expect
      .poll(() => ids(editors[0].document[0].children))
      .toEqual(["i2", "i1", "i3"]);
    expect(lists(editors[0].document)).toBe(1);
  });

  it("moves a namedOnly layout block into a list of another editor", async ({
    setupEditor,
  }) => {
    const editors = await setupLayoutEditors(
      setupEditor,
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

    await expect
      .poll(() => ids(editors[0].document[0].children))
      .toEqual(["i2"]);
    // The item moved into the other list, without a new list around it.
    await expect
      .poll(() =>
        editors[1].document[0].children.map((child) => ({
          type: child.type,
          text: child.children[0]?.content,
        })),
      )
      .toEqual(
        ["One", "Uno"].map((text) => ({
          type: "item",
          text: [{ type: "text", text, styles: {} }],
        })),
      );
    expect(lists(editors[1].document)).toBe(1);
  });
});

// Playwright doesn't correctly simulate drag events in Firefox.
describe.skipIf(browserName === "firefox")("Dropping into a block", () => {
  // The highlight of the toggle used to be set on its element directly, which
  // ProseMirror read back as a DOM change and drew the toggle again: the
  // browser then dropped the drag without a `drop` event.
  it("drops a block onto a closed toggle as its first child", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const editors = await setupLayoutEditors(setupEditor, [
      { id: "toggle", type: "toggleListItem", content: "Toggle" },
      { id: "dragged", type: "paragraph", content: "Dragged" },
    ]);

    await startBlockDrag(block("dragged"), onTestFinished);
    const target = getRect(block("toggle").querySelector(".bn-block-content")!);
    await mouseSequence([
      {
        type: "move",
        x: target.x + target.width / 2,
        y: target.y + target.height / 2,
        steps: 5,
      },
    ]);
    // The drop goes into the toggle once it is highlighted.
    await waitForSelector("[data-drop-target]");
    // Hovers before the drop, as a user does, which gave ProseMirror the time
    // to draw the toggle again.
    await sleep(200);
    await mouseSequence([{ type: "up" }]);

    await expect.poll(() => ids(editors[0].document)).toEqual(["toggle"]);
    expect(ids(editors[0].document[0].children)).toEqual(["dragged"]);
  });
});

// Playwright doesn't correctly simulate drag events in Firefox.
describe.skipIf(browserName === "firefox")(
  "Focus after dragging a block",
  () => {
    // The drop leaves a text cursor in the editor, so the keyboard works on it
    // right away, e.g. to undo the drop (#3165).
    it("undoes a drop with the keyboard", async ({ setupEditor }) => {
      const editors = await setupLayoutEditors(setupEditor, [
        { id: "a", type: "paragraph", content: "A" },
        { id: "b", type: "paragraph", content: "B" },
      ]);

      await dragAndDropBlock(block("a"), block("b"), false);
      await expectElement(editors[0].domElement ?? null).toHaveFocus();
      expect(ids(editors[0].document)).toEqual(["b", "a"]);
      await waitForSelectorDetached(".bn-side-menu");
      // A text cursor shows no formatting toolbar.
      await waitForSelectorDetached(".bn-formatting-toolbar");

      await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
      expect(ids(editors[0].document)).toEqual(["a", "b"]);
      await expectElement(editors[0].domElement ?? null).toHaveFocus();
      expectVisibleBlockSelection(editors[0], ["a"]);
      await waitForSelectorDetached(".bn-formatting-toolbar");
    });

    it("undoes a drop into a toggle with the keyboard", async ({
      setupEditor,
    }) => {
      const editors = await setupLayoutEditors(setupEditor, [
        { id: "toggle", type: "toggleListItem", content: "Toggle" },
        { id: "dragged", type: "paragraph", content: "Dragged" },
      ]);

      await dragAndDropBlock(
        block("dragged"),
        block("toggle").querySelector(".bn-block-content")!,
        false,
      );
      await expectElement(editors[0].domElement ?? null).toHaveFocus();
      expect(ids(editors[0].document[0].children)).toEqual(["dragged"]);

      await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
      expect(ids(editors[0].document)).toEqual(["toggle", "dragged"]);
      expectVisibleBlockSelection(editors[0], ["dragged"]);
    });

    // A dropped block without text has no place for a text cursor.
    it("undoes a drop of an image with the keyboard", async ({
      setupEditor,
    }) => {
      const editors = await setupLayoutEditors(setupEditor, [
        { id: "a", type: "paragraph", content: "A" },
        { id: "image", type: "image" },
        { id: "b", type: "paragraph", content: "B" },
      ]);

      await dragAndDropBlock(block("image"), block("b"), false);
      await expectElement(editors[0].domElement ?? null).toHaveFocus();
      expect(ids(editors[0].document)).toEqual(["a", "b", "image"]);
      await waitForSelectorDetached(".bn-formatting-toolbar");

      await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
      expect(ids(editors[0].document)).toEqual(["a", "image", "b"]);
      expectVisibleBlockSelection(editors[0], ["image"]);
    });

    it("restores a visible multi-block selection after undoing a drop", async ({
      setupEditor,
    }) => {
      const editors = await setupLayoutEditors(setupEditor, [
        { id: "a", type: "paragraph", content: "A" },
        { id: "b", type: "paragraph", content: "B" },
        { id: "c", type: "paragraph", content: "C" },
      ]);
      editors[0].setSelection("a", "b");

      await dragAndDropBlock(block("a"), block("c"), false);
      expect(ids(editors[0].document)).toEqual(["c", "a", "b"]);
      await expectElement(editors[0].domElement ?? null).toHaveFocus();
      await userEvent.keyboard(`{${MOD}>}z{/${MOD}}`);
      expect(ids(editors[0].document)).toEqual(["a", "b", "c"]);
      expectVisibleBlockSelection(editors[0], ["a", "b"]);
      await waitForSelectorDetached(".bn-formatting-toolbar");
    });
  },
);
