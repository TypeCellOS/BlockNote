import { afterEach, describe, expect, it } from "vite-plus/test";

import type { ContainerUIInfo } from "../../api/blockManipulation/containers/containerUI.js";
import {
  getContainerChildAtCursor,
  getDirectChildBlocks,
  hasHorizontalContainerAncestor,
  isHorizontalContainer,
} from "./sideMenuContainerGeometry.js";

// The side-menu container geometry that reads live layout: the
// `querySelectorAll`/`closest` walks and the rect measurements behind them. A
// container whose children happen to sit side-by-side must be recognised as
// horizontal without declaring anything. (The pure rect arithmetic these
// build on is unit-tested in `sideMenuContainerGeometry.test.ts`.)
//
// The DOM trees are attached to the real document and laid out by the real
// engine; nothing stubs `getBoundingClientRect`. A column list inside a real
// editor is covered end-to-end by
// `tests/src/end-to-end/multicolumn/multicolumn.test.tsx`.

/** Attaches a tree to the document so the browser actually lays it out. */
function mount<T extends HTMLElement>(el: T): T {
  document.body.appendChild(el);
  mounted.push(el);
  return el;
}

let mounted: HTMLElement[] = [];

afterEach(() => {
  mounted.forEach((el) => el.remove());
  mounted = [];
});

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
