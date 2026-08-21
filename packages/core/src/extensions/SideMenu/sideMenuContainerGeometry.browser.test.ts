import { afterEach, describe, expect, it } from "vite-plus/test";

import type { ContainerUIInfo } from "../../api/blockManipulation/containers/containerUI.js";
import {
  getContainerChildAtCursor,
  getDirectChildBlocks,
  hasHorizontalContainerAncestor,
  isHorizontalContainer,
  rectIndexAtCursor,
  rectsAreSideBySide,
  type BlockRect,
} from "./sideMenuContainerGeometry.js";

// The side-menu container geometry: the pure rect arithmetic, and the
// `querySelectorAll`/`closest` walks against live layout. A container whose
// children happen to sit side-by-side must be recognised as horizontal
// without declaring anything.
//
// The DOM trees are attached to the real document and laid out by the real
// engine; nothing stubs `getBoundingClientRect`. A column list inside a real
// editor is covered end-to-end by
// `tests/src/end-to-end/multicolumn/multicolumn.test.tsx`.

const rect = (
  top: number,
  bottom: number,
  left: number,
  right: number,
): BlockRect => ({ top, bottom, left, right });

// Two columns of a column list: same vertical band, adjacent horizontally.
const SIDE_BY_SIDE = [rect(0, 100, 0, 100), rect(0, 100, 100, 200)];
// Two blocks of a callout: same horizontal band, stacked vertically.
const STACKED = [rect(0, 40, 0, 200), rect(50, 90, 0, 200)];

describe("rectsAreSideBySide", () => {
  it("is true when two rects overlap vertically, false when stacked", () => {
    expect(rectsAreSideBySide(SIDE_BY_SIDE)).toBe(true);
    expect(rectsAreSideBySide(STACKED)).toBe(false);
    // Degenerate inputs are never a row.
    expect(rectsAreSideBySide([rect(0, 100, 0, 100)])).toBe(false);
    expect(rectsAreSideBySide([])).toBe(false);
  });

  it("treats abutting rects as stacked, but counts a one-pixel overlap", () => {
    // The second rect's top exactly meets the first's bottom. A stack with no
    // gap must not be misread as a row.
    expect(
      rectsAreSideBySide([rect(0, 40, 0, 200), rect(40, 80, 0, 200)]),
    ).toBe(false);
    expect(
      rectsAreSideBySide([rect(0, 41, 0, 100), rect(40, 80, 0, 100)]),
    ).toBe(true);
  });

  it("finds an overlapping pair that isn't the first two", () => {
    // The loop is over every pair, not just neighbours. A column list whose
    // first two children happen to be stacked is still a row.
    expect(
      rectsAreSideBySide([
        rect(0, 40, 0, 100),
        rect(40, 80, 0, 100),
        rect(40, 80, 100, 200),
      ]),
    ).toBe(true);
  });
});

describe("rectIndexAtCursor", () => {
  it("returns the rect whose x range contains the cursor (side-by-side)", () => {
    // Both rects share the y range, so only x distinguishes them. The
    // vertical-only fallback recorded for the first must not win over an x
    // match found later in the list; otherwise hovering the second column of
    // a row would resolve to its neighbour.
    expect(rectIndexAtCursor(SIDE_BY_SIDE, { x: 150, y: 50 })).toBe(1);
    expect(rectIndexAtCursor(SIDE_BY_SIDE, { x: 10, y: 50 })).toBe(0);
  });

  it("falls back to the first vertical match when x is in the gutter", () => {
    // The cursor's y is in the first block's band but its x is left of it (the
    // side-menu gutter). The first vertical match wins.
    expect(rectIndexAtCursor(STACKED, { x: -20, y: 20 })).toBe(0);
  });

  it("returns undefined when the cursor misses every rect vertically", () => {
    expect(rectIndexAtCursor(STACKED, { x: 10, y: 999 })).toBeUndefined();
    expect(rectIndexAtCursor(STACKED, { x: 10, y: -999 })).toBeUndefined();
    expect(rectIndexAtCursor([], { x: 10, y: 10 })).toBeUndefined();
  });

  it("includes the rect edges", () => {
    const single = [rect(0, 40, 0, 200)];
    expect(rectIndexAtCursor(single, { x: 0, y: 0 })).toBe(0);
    expect(rectIndexAtCursor(single, { x: 200, y: 40 })).toBe(0);
  });
});

let mounted: HTMLElement[] = [];

afterEach(() => {
  mounted.forEach((el) => el.remove());
  mounted = [];
});

/** Attaches a tree to the document so the browser actually lays it out. */
function mount<T extends HTMLElement>(el: T): T {
  document.body.appendChild(el);
  mounted.push(el);
  return el;
}

function el(nodeType: string): HTMLElement {
  const node = document.createElement("div");
  node.setAttribute("data-node-type", nodeType);
  return node;
}

/** The `blockOuter > blockContainer` chrome BlockNote renders around every
 * regular block, with real text in it so it has a real height. */
function regularChild(text = "block"): {
  outer: HTMLElement;
  blockContainer: HTMLElement;
} {
  const outer = el("blockOuter");
  const blockContainer = el("blockContainer");
  blockContainer.textContent = text;
  outer.append(blockContainer);
  return { outer, blockContainer };
}

function uiInfo(containerTypes: string[]): ContainerUIInfo {
  const set = new Set(containerTypes);
  return {
    containerTypes: set,
    draggableContainerTypes: set,
    nonDraggableBlockTypes: new Set<string>(),
    containerSelector: containerTypes.length
      ? containerTypes.map((t) => `[data-node-type="${t}"]`).join(",")
      : null,
  };
}

/**
 * A column list laid out the way the real one is: a flex row of two columns,
 * each holding one block. Nothing declares "horizontal". The browser puts the
 * columns side by side and the module has to notice.
 */
function buildColumnList() {
  const info = uiInfo(["columnList", "column"]);

  const columnList = el("columnList");
  columnList.style.display = "flex";
  columnList.style.width = "400px";

  const columnA = el("column");
  const columnB = el("column");
  for (const column of [columnA, columnB]) {
    column.style.flex = "1";
  }

  const childA = regularChild("A");
  const childB = regularChild("B");
  columnA.append(childA.outer);
  columnB.append(childB.outer);
  columnList.append(columnA, columnB);
  mount(columnList);

  return { info, columnList, columnA, columnB, childA, childB };
}

/** A callout: an ordinary block-flow container, so its children stack. */
function buildVerticalContainer() {
  const info = uiInfo(["callout"]);

  const callout = el("callout");
  callout.style.width = "400px";
  const first = regularChild("first");
  const second = regularChild("second");
  callout.append(first.outer, second.outer);
  mount(callout);

  return { info, callout, first, second };
}

describe("getDirectChildBlocks", () => {
  it("returns direct child blocks, skipping nested grandchildren", () => {
    const { info, columnList, columnA, columnB } = buildColumnList();

    // The blocks inside each column must not come back as the list's own
    // children. The `closest` check stops the walk one level down.
    expect(getDirectChildBlocks(columnList, info)).toEqual([columnA, columnB]);
  });

  it("sees through blockOuter wrappers to the blockContainer child", () => {
    const { info, columnA, childA } = buildColumnList();

    // The column's own direct child is the wrapped blockContainer, not the
    // blockOuter chrome (which isn't a block in the selector's sense).
    expect(getDirectChildBlocks(columnA, info)).toEqual([
      childA.blockContainer,
    ]);
  });
});

describe("isHorizontalContainer", () => {
  it("recognises a real flex row as horizontal", () => {
    const { info, columnList, columnA, columnB } = buildColumnList();

    // Nothing declares the column list horizontal and no rect is stubbed;
    // the detection runs against real layout.
    expect(isHorizontalContainer(columnList, info)).toBe(true);

    // Also asserted as raw geometry, so a failure shows whether the layout
    // or the detection broke.
    const a = columnA.getBoundingClientRect();
    const b = columnB.getBoundingClientRect();
    expect(a.width).toBeGreaterThan(0);
    expect(b.left).toBeGreaterThanOrEqual(a.right - 1);
    expect(a.top).toBe(b.top);
  });

  it("is false for a container whose children stack", () => {
    const { info, callout } = buildVerticalContainer();

    expect(isHorizontalContainer(callout, info)).toBe(false);
  });

  it("is false for a column holding a single block", () => {
    const { info, columnA } = buildColumnList();

    expect(isHorizontalContainer(columnA, info)).toBe(false);
  });
});

describe("hasHorizontalContainerAncestor", () => {
  it("is true for a block nested inside a column of a column list", () => {
    const { info, childA } = buildColumnList();

    // The block sits inside a (vertical) column, whose parent column list is
    // the horizontal one, so the walk must climb past the column.
    expect(hasHorizontalContainerAncestor(childA.blockContainer, info)).toBe(
      true,
    );
  });

  it("is false for a block inside a purely vertical container", () => {
    const { info, first } = buildVerticalContainer();

    expect(hasHorizontalContainerAncestor(first.blockContainer, info)).toBe(
      false,
    );
  });
});

describe("getContainerChildAtCursor", () => {
  it("returns undefined for a non-container element", () => {
    const { info, childA } = buildColumnList();

    expect(
      getContainerChildAtCursor(childA.blockContainer, { x: 10, y: 10 }, info),
    ).toBeUndefined();
  });

  it("resolves the hovered column of a real row", () => {
    const { info, columnList, columnA, columnB } = buildColumnList();
    const b = columnB.getBoundingClientRect();

    expect(
      getContainerChildAtCursor(
        columnList,
        { x: b.left + b.width / 2, y: b.top + b.height / 2 },
        info,
      ),
    ).toBe(columnB);

    const a = columnA.getBoundingClientRect();
    expect(
      getContainerChildAtCursor(
        columnList,
        { x: a.left + a.width / 2, y: a.top + a.height / 2 },
        info,
      ),
    ).toBe(columnA);
  });
});
