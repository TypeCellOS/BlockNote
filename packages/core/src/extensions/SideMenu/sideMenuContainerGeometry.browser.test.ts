import { afterEach, describe, expect, it } from "vite-plus/test";

import type { ContainerUIInfo } from "../../api/blockManipulation/containers/containerUI.js";
import {
  getContainerChildAtCursor,
  getDirectChildBlocks,
  hasHorizontalContainerAncestor,
  isHorizontalContainer,
} from "./sideMenuContainerGeometry.js";

// The DOM half of the side-menu container geometry: the `querySelectorAll` /
// `closest` walks that find a container's direct child blocks, and the
// live-layout claim the module exists for — that a container whose children
// *happen* to sit side-by-side is recognised as horizontal without declaring
// anything.
//
// Everything here is attached to the real document and laid out by the real
// engine; nothing stubs `getBoundingClientRect`. The counterpart node suite
// (`sideMenuContainerGeometry.test.ts`) covers the arithmetic these adapters
// feed. A column list inside a real editor is covered end-to-end by
// `tests/src/end-to-end/multicolumn/multicolumn.test.tsx`.

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
 * each holding one block. Nothing declares "horizontal" — the browser puts the
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
    // children — the `closest` check is what stops the walk one level down.
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

  it("returns nothing for a container with no block children", () => {
    const info = uiInfo(["callout"]);
    const empty = mount(el("callout"));

    expect(getDirectChildBlocks(empty, info)).toEqual([]);
  });
});

describe("isHorizontalContainer", () => {
  it("recognises a real flex row as horizontal", () => {
    const { info, columnList, columnA, columnB } = buildColumnList();

    // The claim the module exists for, asserted against real layout: nothing
    // declares the column list horizontal, and no rect is stubbed.
    expect(isHorizontalContainer(columnList, info)).toBe(true);

    // Stated as geometry too, so a failure says whether the layout or the
    // detection is what broke.
    const a = columnA.getBoundingClientRect();
    const b = columnB.getBoundingClientRect();
    expect(a.width).toBeGreaterThan(0);
    expect(b.left).toBeGreaterThanOrEqual(a.right - 1);
    expect(a.top).toBe(b.top);
  });

  it("is false for a container whose children stack", () => {
    const { info, callout, first, second } = buildVerticalContainer();

    expect(isHorizontalContainer(callout, info)).toBe(false);

    const a = first.blockContainer.getBoundingClientRect();
    const b = second.blockContainer.getBoundingClientRect();
    expect(a.height).toBeGreaterThan(0);
    expect(b.top).toBeGreaterThanOrEqual(a.bottom);
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
    // the horizontal one — the walk must climb past the column.
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

  it("is false when there is no container ancestor", () => {
    const info = uiInfo(["columnList", "column"]);
    const loose = regularChild();
    mount(loose.outer);

    expect(hasHorizontalContainerAncestor(loose.blockContainer, info)).toBe(
      false,
    );
  });

  it("is false when the schema declares no containers", () => {
    const { childA } = buildColumnList();

    expect(
      hasHorizontalContainerAncestor(childA.blockContainer, uiInfo([])),
    ).toBe(false);
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

  it("falls back to the block on that row when x is in the gutter", () => {
    const { info, callout, first } = buildVerticalContainer();
    const rect = first.blockContainer.getBoundingClientRect();

    // The cursor's y is in the first block's band but its x is left of the
    // container entirely — where the side menu renders.
    expect(
      getContainerChildAtCursor(
        callout,
        { x: rect.left - 20, y: rect.top + rect.height / 2 },
        info,
      ),
    ).toBe(first.blockContainer);
  });

  it("returns undefined when the cursor is below all children", () => {
    const { info, callout } = buildVerticalContainer();

    expect(
      getContainerChildAtCursor(
        callout,
        { x: 10, y: callout.getBoundingClientRect().bottom + 500 },
        info,
      ),
    ).toBeUndefined();
  });
});
