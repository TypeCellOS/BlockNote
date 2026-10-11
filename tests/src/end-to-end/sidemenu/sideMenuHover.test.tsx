import {
  BlockNoteEditor,
  BlockNoteSchema,
  type PartialBlock,
} from "@blocknote/core";
import {
  SideMenuExtension,
  type SideMenuOptions,
} from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import {
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import type { CSSProperties } from "react";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import {
  DRAG_HANDLE_ADD_SELECTOR,
  DRAG_HANDLE_SELECTOR,
  NEST_BLOCK_BUTTON_SELECTOR,
} from "../../utils/const.js";
import { browserName } from "../../utils/context.js";
import { sleep, waitForSelector } from "../../utils/editor.js";
import { getRect, mouseSequence } from "../../utils/mouse.js";

// How the side menu follows the pointer: which block it shows for, and
// whether it shows at all. The `known issue` tests describe the wanted
// behavior and are marked `test.fails` until a fix lands; a fix flips them to
// `test`. The other tests guard behavior that works today.

const schema = withMultiColumn(BlockNoteSchema.create());
type Editor = BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

const editors: Record<string, Editor> = {};

function Editor(props: {
  name: string;
  content: PartialBlock<any, any, any>[];
  style?: CSSProperties;
  sideMenu?: SideMenuOptions;
}) {
  const editor = useCreateBlockNote({
    schema,
    dropCursor: multiColumnDropCursor,
    initialContent: props.content,
    sideMenu: props.sideMenu,
  });
  editors[props.name] = editor;
  return (
    <div style={props.style} data-editor-name={props.name}>
      <BlockNoteView editor={editor} />
    </div>
  );
}

afterEach(async () => {
  // Moves the pointer away so the next test starts without a menu.
  await mouseSequence([{ type: "move", x: 1, y: 1 }]);
  cleanup();
  for (const name of Object.keys(editors)) {
    delete editors[name];
  }
});

/** The block the side menu shows for in an editor, or `undefined`. */
function menuBlock(name = "main"): string | undefined {
  const state = editors[name].getExtension(SideMenuExtension)?.store.state;
  return state?.show ? state.block.id : undefined;
}

function blockRect(id: string, name = "main"): DOMRect {
  const element = document.querySelector(
    `[data-editor-name="${name}"] .bn-block[data-id="${id}"] .bn-block-content`,
  );
  if (!element) {
    throw new Error(`Block "${id}" is not rendered in editor "${name}"`);
  }
  return element.getBoundingClientRect();
}

/** Moves the pointer through the points, one small step at a time. */
async function walk(points: { x: number; y: number }[], steps = 8) {
  await mouseSequence(
    points.map(({ x, y }) => ({ type: "move", x, y, steps })),
  );
  // The menu updates on the next frames.
  await sleep(100);
}

async function hoverBlock(id: string, name = "main") {
  const rect = blockRect(id, name);
  await walk([{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }]);
}

function paragraph(id: string, text = id): PartialBlock<any, any, any> {
  return { id, type: "paragraph", content: text };
}

// The multi-column example's document: its column widths put the add button
// of column two and three blocks over the column to their left.
const columnsDocument: PartialBlock<any, any, any>[] = [
  paragraph("before", "Welcome to this demo!"),
  {
    id: "list",
    type: "columnList",
    children: [
      {
        id: "col-1",
        type: "column",
        props: { width: 0.8 },
        children: [paragraph("c1", "This paragraph is in a column!")],
      },
      {
        id: "col-2",
        type: "column",
        props: { width: 1.4 },
        children: [
          { id: "c2", type: "heading", content: "So is this heading!" },
        ],
      },
      {
        id: "col-3",
        type: "column",
        props: { width: 0.8 },
        children: [
          paragraph("c3", "You can have multiple blocks in a column too"),
          {
            id: "c3-list",
            type: "bulletListItem",
            content: "Block 1",
          },
        ],
      },
    ],
  },
  paragraph("after", "After the columns"),
];

describe("side menu hover: works today", () => {
  test("switches between blocks stacked vertically", async () => {
    await render(
      <Editor name="main" content={[paragraph("a"), paragraph("b")]} />,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("a");
    expect(menuBlock()).toBe("a");
    await hoverBlock("b");
    expect(menuBlock()).toBe("b");
  });

  test("shows a nested block's menu when hovering its left side", async () => {
    await render(
      <Editor
        name="main"
        content={[{ ...paragraph("parent"), children: [paragraph("child")] }]}
      />,
    );
    await waitForSelector(".bn-editor");

    const rect = blockRect("child");
    await walk([{ x: rect.x + 4, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBe("child");
  });

  test("shows the menu when hovering the editor's gutter beside a block", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a")]}
        style={{ marginLeft: 200, width: 600 }}
      />,
    );
    await waitForSelector(".bn-editor");

    const rect = blockRect("a");
    await walk([{ x: rect.x - 30, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBe("a");
  });

  test("switches between blocks in neighbouring columns", async () => {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");

    await hoverBlock("c2");
    expect(menuBlock()).toBe("c2");
    await hoverBlock("c1");
    expect(menuBlock()).toBe("c1");
    await hoverBlock("c3");
    expect(menuBlock()).toBe("c3");
  });

  test("leaves the menu on a block's handle buttons", async () => {
    await render(
      <Editor name="main" content={[paragraph("a"), paragraph("b")]} />,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("a");
    const add = getRect(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    await walk([{ x: add.x + add.width / 2, y: add.y + add.height / 2 }]);
    expect(menuBlock()).toBe("a");
  });
  // The "+" of a column-three block overlaps column two's heading. Walking
  // straight onto it keeps the menu; the #3059 review saw it jump, but that
  // no longer reproduces (the diagonal case below still fails).
  test("keeps column three's block while walking left onto its add button", async () => {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");

    // The list item sits level with column two's heading, and the button's
    // left edge overlaps that heading.
    await hoverBlock("c3-list");
    expect(menuBlock()).toBe("c3-list");
    const add = getRect(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    const y = add.y + add.height / 2;
    await walk([
      { x: add.x + add.width + 12, y },
      { x: add.x + 3, y },
    ]);
    expect(menuBlock()).toBe("c3-list");
  });
});

describe("side menu hover: known issues", () => {
  // #3059 review (SideMenu.ts:56): the "+" of a block in column 2 or 3 sits
  // over the column to its left. Moving diagonally towards it crosses that
  // column and hides the menu.
  test("keeps column two's block while moving diagonally from its bottom to its add button", async () => {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");

    // From the heading's bottom left, so the path crosses column one before
    // it reaches the button.
    const block = blockRect("c2");
    await walk([{ x: block.x + 6, y: block.bottom - 4 }]);
    expect(menuBlock()).toBe("c2");
    const add = getRect(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    await walk([{ x: add.x + add.width / 2, y: add.y + add.height / 2 }], 20);
    expect(menuBlock()).toBe("c2");
  });

  // BLO-963: no menu when the editor's right side is outside the viewport.
  // Note: in a 3000px wide editor the blocks are centered, so block "a" starts
  // beyond the 1280px viewport and the pointer never gets there: the browser
  // dispatches no events for it. The test below reproduces BLO-963 with the
  // block's left part on screen.
  // Fails by design: the last pointer event lands ~110px left of the
  // off-screen block, outside the narrow gutter band.
  test.fails("shows the menu when the editor's right side is outside the viewport", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a"), paragraph("b")]}
        style={{ marginLeft: 100, width: 3000 }}
      />,
    );
    await waitForSelector(".bn-editor");

    const rect = blockRect("a");
    await walk([{ x: rect.x + 60, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBe("a");
  });

  // BLO-963, with the hovered block's left part inside the viewport and its
  // right side outside it.
  test("shows the menu when a block's right side is outside the viewport", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a"), paragraph("b")]}
        style={{ marginLeft: window.innerWidth - 300, width: 700 }}
      />,
    );
    await waitForSelector(".bn-editor");

    const rect = blockRect("a");
    expect(rect.left).toBeLessThan(window.innerWidth - 100);
    expect(rect.right).toBeGreaterThan(window.innerWidth);
    await walk([{ x: rect.x + 60, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBe("a");
  });

  // BLO-1072: where an editor in an overlay covers another editor, the menu
  // goes to the editor underneath.
  test("shows the menu of the editor on top where two editors overlap", async () => {
    await render(
      <>
        <Editor
          name="under"
          content={[paragraph("u1"), paragraph("u2"), paragraph("u3")]}
          style={{ width: 600 }}
        />
        <Editor
          name="over"
          content={[paragraph("o1"), paragraph("o2")]}
          style={{
            position: "fixed",
            top: 20,
            left: 40,
            width: 500,
            zIndex: 10,
            background: "white",
          }}
        />
      </>,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("o1", "over");
    expect(menuBlock("over")).toBe("o1");
    expect(menuBlock("under")).toBeUndefined();
  });

  // BLO-877: the menu shows with the pointer well to the left of the editor,
  // as long as it's at the height of a block.
  test("hides the menu when the pointer is far to the left of the editor", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a")]}
        style={{ marginLeft: 400, width: 500 }}
      />,
    );
    await waitForSelector(".bn-editor");

    const rect = blockRect("a");
    await walk([{ x: rect.x - 200, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBeUndefined();
  });

  // BLO-968: the menu is missing when the editor is wider than the element
  // that scrolls it horizontally (same root cause as BLO-963: the editor's
  // right side is not visible).
  test("shows a visible menu when the editor scrolls horizontally", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a", "Some text in a block"), paragraph("b")]}
        style={{ width: 300, overflowX: "auto" }}
      />,
    );
    await waitForSelector(".bn-editor");
    document.querySelector<HTMLElement>(".bn-container")!.style.minWidth =
      "700px";

    // On the visible part of the block: its middle is scrolled out of view.
    const scroller = document
      .querySelector('[data-editor-name="main"]')!
      .getBoundingClientRect();
    const rect = blockRect("b");
    expect(rect.right).toBeGreaterThan(scroller.right);
    await walk([{ x: rect.x + 20, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBe("b");
    const add = document.querySelector<HTMLElement>(DRAG_HANDLE_ADD_SELECTOR);
    expect(add?.checkVisibility({ visibilityProperty: true })).toBe(true);
  });
  // #2526: in columns inside a toggle, the add button of a left-column block
  // disappears when the pointer moves onto it.
  test("keeps a left-column block's menu inside a toggle, and its add button works", async () => {
    await render(
      <Editor
        name="main"
        content={[
          {
            id: "toggle",
            type: "toggleListItem",
            content: "Toggle",
            children: [
              {
                id: "t-list",
                type: "columnList",
                children: [
                  {
                    id: "t-col-1",
                    type: "column",
                    children: [paragraph("left", "Left column")],
                  },
                  {
                    id: "t-col-2",
                    type: "column",
                    children: [paragraph("right", "Right column")],
                  },
                ],
              },
            ],
          },
        ]}
      />,
    );
    await waitForSelector(".bn-editor");
    const chevron = await waitForSelector(".bn-toggle-button");
    const c = chevron.getBoundingClientRect();
    await mouseSequence([
      { type: "click", x: c.x + c.width / 2, y: c.y + c.height / 2 },
    ]);
    await sleep(100);

    const block = blockRect("left");
    await walk([{ x: block.x + 20, y: block.y + block.height / 2 }]);
    expect(menuBlock()).toBe("left");
    const add = getRect(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    await walk([{ x: add.x + add.width / 2, y: add.y + add.height / 2 }]);
    expect(menuBlock()).toBe("left");
    // The button must also work: clicking it adds a block after "left".
    await mouseSequence([
      { type: "click", x: add.x + add.width / 2, y: add.y + add.height / 2 },
    ]);
    await sleep(100);
    const column = editors.main.getParentBlock("left")!;
    expect(column.children.map((child) => child.id)[0]).toBe("left");
    expect(column.children).toHaveLength(2);
  });
});

describe("side menu hover: heading for the menu", () => {
  // Starts at the bottom of column two's heading, then moves towards its add
  // button (which sits over column one), stopping just below it.
  async function headTowardsAddButton() {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");

    const block = blockRect("c2");
    await walk([{ x: block.x + 6, y: block.bottom - 4 }]);
    expect(menuBlock()).toBe("c2");
    const add = getRect(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    await walk([{ x: add.x + add.width / 2, y: add.bottom + 6 }], 10);
    expect(menuBlock()).toBe("c2");
  }

  test("follows the pointer once it rests on its way to the menu", async () => {
    await headTowardsAddButton();
    await sleep(500);
    expect(menuBlock()).not.toBe("c2");
  });

  test("follows the pointer at once when it turns away from the menu", async () => {
    await headTowardsAddButton();
    await hoverBlock("after");
    expect(menuBlock()).toBe("after");
  });

  // The landing rule: once the pointer reached the menu, leaving it anywhere
  // other than its block follows the block under the pointer at once, even
  // where the way to the menu kept the block (see `headTowardsAddButton`).
  test("follows the pointer at once when it leaves the menu it reached", async () => {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");

    const block = blockRect("c2");
    await walk([{ x: block.x + 6, y: block.bottom - 4 }]);
    const add = getRect(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    await walk([{ x: add.x + add.width / 2, y: add.y + add.height / 2 }], 20);
    expect(menuBlock()).toBe("c2");

    await walk([{ x: add.x + add.width / 2, y: add.bottom + 6 }], 4);
    expect(menuBlock()).not.toBe("c2");
  });
});

describe("side menu hover: pointer input", () => {
  test("hides the menu when the pointer leaves the window", async () => {
    await render(
      <Editor name="main" content={[paragraph("a"), paragraph("b")]} />,
    );
    await waitForSelector(".bn-editor");

    const rect = blockRect("a");
    await walk([{ x: rect.x + 6, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBe("a");
    // Above the test frame: the frame's document gets a `mouseout` without
    // a `relatedTarget`.
    await walk([{ x: rect.x + 6, y: -20 }], 4);
    expect(menuBlock()).toBeUndefined();
  });

  // Browser extensions dispatch events like these. Without coordinates, the
  // block lookup would throw on non-finite coordinates.
  test("ignores synthetic mouse events without coordinates", async () => {
    await render(
      <Editor name="main" content={[paragraph("a"), paragraph("b")]} />,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("a");
    expect(menuBlock()).toBe("a");
    const target = document.querySelector('.bn-block[data-id="b"]')!;
    for (const type of ["mousemove", "mouseout"]) {
      target.dispatchEvent(new Event(type, { bubbles: true }));
    }
    expect(menuBlock()).toBe("a");
  });
});

async function walkAndSample(points: { x: number; y: number }[], steps = 8) {
  const samples: (string | undefined)[] = [];
  function sample() {
    samples.push(menuBlock());
  }
  // `window` listeners run after every `document` listener, so this sees the
  // menu after the extension's own listener ran.
  window.addEventListener("mousemove", sample);
  try {
    await walk(points, steps);
  } finally {
    window.removeEventListener("mousemove", sample);
  }
  return samples;
}

describe("side menu hover: engaging a block", () => {
  // Between two columns, the pointer leaves the left block's element ~15px
  // before it reaches the next column, while the extension still resolves the
  // left block. Releasing the block there must neither hide the menu (the
  // "blink" band) nor re-engage the block the pointer just left, which no
  // `mouseleave` would release again.
  test("walking from column one to column two never hides the menu", async () => {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");

    const c1 = blockRect("c1");
    const c2 = blockRect("c2");
    const y = c1.y + 6;
    await walk([{ x: c1.x + c1.width / 2, y }]);
    expect(menuBlock()).toBe("c1");

    const samples = await walkAndSample([{ x: c2.x + 30, y }], 40);
    expect(samples).not.toContain(undefined);
    expect(menuBlock()).toBe("c2");
    // Once on column two's block, the menu doesn't go back to column one's.
    expect(samples.slice(samples.indexOf("c2"))).not.toContain("c1");
  });

  test("a block left through its column's padding and re-entered is released again", async () => {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");

    const c1 = blockRect("c1");
    const y = c1.y + 6;
    await walk([{ x: c1.x + c1.width / 2, y }]);
    expect(menuBlock()).toBe("c1");
    // Into the padding right of the block, where c1 still resolves, and back.
    const samples = await walkAndSample([
      { x: c1.right + 6, y },
      { x: c1.right - 20, y },
      { x: c1.right + 6, y },
    ]);
    expect(samples).not.toContain(undefined);
    expect(menuBlock()).toBe("c1");

    // Away from c1 and its menu, the menu follows the pointer again.
    await hoverBlock("c3");
    expect(menuBlock()).toBe("c3");
    await hoverBlock("after");
    expect(menuBlock()).toBe("after");
  });

  // The menu must follow within the same move that takes the pointer onto
  // the next block, never hide or lag in between.
  test("moving down onto the next block follows it within the same move", async () => {
    await render(
      <Editor name="main" content={[paragraph("a"), paragraph("b")]} />,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("a");
    expect(menuBlock()).toBe("a");
    const b = blockRect("b");
    // The menu's block on each move the pointer is over block "b".
    const overB: (string | undefined)[] = [];
    function sample(event: MouseEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest('.bn-block[data-id="b"]')
      ) {
        overB.push(menuBlock());
      }
    }
    window.addEventListener("mousemove", sample);
    try {
      await walk([{ x: b.x + b.width / 2, y: b.y + b.height / 2 }], 20);
    } finally {
      window.removeEventListener("mousemove", sample);
    }
    expect(overB.length).toBeGreaterThan(0);
    expect(overB).toEqual(overB.map(() => "b"));
  });

  test("moving onto a nested block shows its menu while the parent is engaged", async () => {
    await render(
      <Editor
        name="main"
        content={[{ ...paragraph("parent"), children: [paragraph("child")] }]}
      />,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("parent");
    expect(menuBlock()).toBe("parent");
    await hoverBlock("child");
    expect(menuBlock()).toBe("child");
    await hoverBlock("parent");
    expect(menuBlock()).toBe("parent");
  });
});

// The drag handle is the drag source: if the menu hid or moved during the
// drag, React would remove the handle, its `dragend` would never fire, and the
// drag image would stay in the document (it then broke the next toggle test).
// Real mouse drags are only emulated reliably in Chromium.
describe.skipIf(browserName !== "chromium")("side menu hover: dragging", () => {
  test("keeps the drag handle mounted until the drag ends", async () => {
    await render(
      <Editor
        name="main"
        content={[
          { id: "t", type: "toggleListItem", content: "Toggle" },
          paragraph("drag", "Drag me"),
        ]}
      />,
    );
    await waitForSelector(".bn-editor");
    const chevron = getRect(await waitForSelector(".bn-toggle-button"));
    await mouseSequence([
      {
        type: "click",
        x: chevron.x + chevron.width / 2,
        y: chevron.y + chevron.height / 2,
      },
    ]);
    await sleep(100);

    await hoverBlock("drag");
    expect(menuBlock()).toBe("drag");
    const handle = getRect(await waitForSelector(DRAG_HANDLE_SELECTOR));
    const target = getRect(
      await waitForSelector(".bn-toggle-add-block-button"),
    );
    await walk([
      { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 },
    ]);
    await mouseSequence([{ type: "down" }]);
    await sleep(100);
    await mouseSequence([
      {
        type: "move",
        x: target.x + target.width / 2,
        y: target.y + target.height / 2,
        steps: 5,
      },
    ]);
    await sleep(100);
    await mouseSequence([{ type: "up" }]);
    await sleep(100);

    expect(
      editors.main.getBlock("t")!.children.map((child) => child.id),
    ).toEqual(["drag"]);
    expect(document.querySelector(".bn-drag-preview")).toBeNull();
  });
});

describe("side menu hover: the document changes under a still pointer", () => {
  test("follows the block that moves under the pointer when a block above is removed", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a"), paragraph("b"), paragraph("c")]}
      />,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("b");
    expect(menuBlock()).toBe("b");
    editors.main.removeBlocks(["a"]);
    await sleep(100);
    // "b" moved up into "a"'s place; "c" is now under the pointer.
    expect(menuBlock()).toBe("c");
  });

  test("follows the block that moves under the pointer when a block above grows", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a"), paragraph("b"), paragraph("c")]}
      />,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("b");
    expect(menuBlock()).toBe("b");
    editors.main.updateBlock("a", {
      content: "A paragraph that wraps over many lines. ".repeat(12),
    });
    await sleep(100);
    // "a" grew under the pointer and pushed "b" down.
    expect(menuBlock()).toBe("a");
  });

  // A side menu button that removes its block, clicked twice without moving
  // the pointer: the block below moves up into its place, and the second
  // click must act on that block, not on the removed one.
  test("follows the block below when the pointer rests on the menu and its block is removed", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a"), paragraph("b"), paragraph("c")]}
      />,
    );
    await waitForSelector(".bn-editor");

    await hoverBlock("b");
    const add = getRect(await waitForSelector(DRAG_HANDLE_ADD_SELECTOR));
    await walk([{ x: add.x + add.width / 2, y: add.y + add.height / 2 }]);
    expect(menuBlock()).toBe("b");

    editors.main.removeBlocks(["b"]);
    await sleep(100);
    expect(menuBlock()).toBe("c");
  });
});

describe("side menu hover: right padding", () => {
  test("shows the menu for the row when hovering the editor's right padding", async () => {
    await render(
      <Editor name="main" content={[paragraph("a"), paragraph("b")]} />,
    );
    await waitForSelector(".bn-editor");

    const editor = document
      .querySelector(".bn-editor")!
      .getBoundingClientRect();
    const rect = blockRect("b");
    await walk([{ x: editor.right - 10, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBe("b");
  });

  test("shows the menu for the row when hovering a middle column's right padding", async () => {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");

    const column = document
      .querySelector('[data-node-type="column"][data-id="col-2"]')!
      .getBoundingClientRect();
    const rect = blockRect("c2");
    // Right of the heading's content, inside column two.
    const x = Math.min(column.right - 3, rect.right + 3);
    expect(x).toBeGreaterThan(rect.right);
    await walk([
      { x: rect.x + 20, y: rect.y + rect.height / 2 },
      { x, y: rect.y + rect.height / 2 },
    ]);
    expect(menuBlock()).toBe("c2");
  });
});

describe("side menu hover: disabled toolbar buttons", () => {
  // A `mouseout` without `relatedTarget` means the pointer left the window,
  // and hides the menu. Entering a disabled element must not count as that.
  // The pointer jumps straight onto the button, as a tap does: a path through
  // the space between the block and the toolbar, outside the editor, hides
  // the menu by itself.
  test("keeps the menu when the pointer moves onto a disabled toolbar button", async () => {
    await render(
      <Editor name="main" content={[paragraph("a", "First block")]} />,
    );
    await waitForSelector(".bn-editor");

    // Select a word with the mouse: the toolbar opens, the pointer is on "a".
    const word = getRect(
      document.querySelector('.bn-block[data-id="a"] .bn-inline-content')!,
    );
    await mouseSequence([
      {
        type: "click",
        x: word.x + 8,
        y: word.y + word.height / 2,
        clickCount: 2,
      },
    ]);
    await sleep(200);
    expect(menuBlock()).toBe("a");
    const nest = await waitForSelector(NEST_BLOCK_BUTTON_SELECTOR);
    // The first block can't be nested.
    expect((nest as HTMLButtonElement).disabled).toBe(true);

    const r = nest.getBoundingClientRect();
    await walk([{ x: r.x + r.width / 2, y: r.y + r.height / 2 }], 1);
    expect(menuBlock()).toBe("a");
  });
});

describe("side menu hover: hover margin", () => {
  test("shows the menu left of the editor within `hoverMargin`", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a")]}
        style={{ marginLeft: 400, width: 500 }}
        sideMenu={{ hoverMargin: 250 }}
      />,
    );
    await waitForSelector(".bn-editor");

    const rect = blockRect("a");
    // Outside the editor element (its padding is 54px), within the margin.
    await walk([{ x: rect.x - 200, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBe("a");
  });

  test("doesn't show the menu above the editor within `hoverMargin`", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a")]}
        style={{ marginLeft: 400, marginTop: 300, width: 500 }}
        sideMenu={{ hoverMargin: 250 }}
      />,
    );
    await waitForSelector(".bn-editor");

    const editor = document
      .querySelector('[data-editor-name="main"] .bn-editor')!
      .getBoundingClientRect();
    const rect = blockRect("a");
    await walk([{ x: rect.x + 20, y: editor.top - 100 }]);
    expect(menuBlock()).toBeUndefined();
  });

  test("hides the menu beyond `hoverMargin`", async () => {
    await render(
      <Editor
        name="main"
        content={[paragraph("a")]}
        style={{ marginLeft: 400, width: 500 }}
        sideMenu={{ hoverMargin: 100 }}
      />,
    );
    await waitForSelector(".bn-editor");

    const rect = blockRect("a");
    await walk([{ x: rect.x - 200, y: rect.y + rect.height / 2 }]);
    expect(menuBlock()).toBeUndefined();
  });
});

describe("side menu hover: wide container padding", () => {
  test("shows the menu for the row in a container's 100px right padding", async () => {
    await render(<Editor name="main" content={columnsDocument} />);
    await waitForSelector(".bn-editor");
    // A stylesheet rule: ProseMirror re-renders a node whose DOM is changed
    // directly, which would drop an inline style.
    const style = document.createElement("style");
    style.textContent =
      '[data-node-type="column"][data-id="col-2"] { padding-right: 100px; }';
    document.head.append(style);
    try {
      await sleep(50);
      const column = document
        .querySelector('[data-node-type="column"][data-id="col-2"]')!
        .getBoundingClientRect();
      const rect = blockRect("c2");
      expect(column.right - rect.right).toBeGreaterThanOrEqual(100);
      // In the middle of the padding, level with the heading.
      await walk([
        { x: rect.x + 20, y: rect.y + rect.height / 2 },
        { x: column.right - 50, y: rect.y + rect.height / 2 },
      ]);
      expect(menuBlock()).toBe("c2");
    } finally {
      style.remove();
    }
  });
});

describe("side menu hover: elements over the editor", () => {
  // A modal (any opaque element) over part of the editor: the editor gets no
  // menu where it is covered, and its usual menu where it is not.
  test("shows no menu over a modal, and the usual menu next to it", async () => {
    await render(
      <>
        <Editor
          name="main"
          content={[paragraph("a"), paragraph("b"), paragraph("c")]}
          style={{ width: 600 }}
        />
        <div
          data-testid="modal"
          style={{
            position: "fixed",
            top: 0,
            left: 300,
            width: 400,
            height: 2000,
            zIndex: 30,
            background: "white",
          }}
        />
      </>,
    );
    await waitForSelector(".bn-editor");

    const b = blockRect("b");
    const modal = document
      .querySelector('[data-testid="modal"]')!
      .getBoundingClientRect();
    expect(b.right).toBeGreaterThan(modal.left);

    // Over the modal, level with "b".
    await walk([{ x: modal.left + 50, y: b.y + b.height / 2 }]);
    expect(menuBlock()).toBeUndefined();

    // On the uncovered part of "b".
    await walk([{ x: b.x + 20, y: b.y + b.height / 2 }]);
    expect(menuBlock()).toBe("b");
  });
});
