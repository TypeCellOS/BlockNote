import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  getNestedBlockAtCursor,
  getDirectChildBlocks,
} from "./sideMenuContainerGeometry.js";

// Exercise container hit testing with real layout, including nested columns.

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
  node.setAttribute("data-id", crypto.randomUUID());
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

/**
 * A column list laid out the way the real one is: a flex row of two columns,
 * each holding one block. Nothing declares "horizontal". The browser puts the
 * columns side by side and the module has to notice.
 */
function buildColumnList() {
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

  return { columnList, columnA, columnB, childA, childB };
}

/** A callout: an ordinary block-flow container, so its children stack. */
function buildVerticalContainer() {
  const callout = el("callout");
  callout.style.width = "400px";
  const first = regularChild("first");
  const second = regularChild("second");
  callout.append(first.outer, second.outer);
  mount(callout);

  return { callout, first, second };
}

describe("getDirectChildBlocks", () => {
  it("returns direct child blocks, skipping nested grandchildren", () => {
    const { columnList, columnA, columnB } = buildColumnList();

    // The blocks inside each column must not come back as the list's own
    // children. The `closest` check stops the walk one level down.
    expect(getDirectChildBlocks(columnList)).toEqual([columnA, columnB]);
  });

  it("sees through blockOuter wrappers to the blockContainer child", () => {
    const { columnA, childA } = buildColumnList();

    // The column's own direct child is the wrapped blockContainer, not the
    // blockOuter chrome (which isn't a block in the selector's sense).
    expect(getDirectChildBlocks(columnA)).toEqual([childA.blockContainer]);
  });
});

describe("getNestedBlockAtCursor", () => {
  it("keeps a regular block as the probe target", () => {
    const { childA } = buildColumnList();
    expect(
      getNestedBlockAtCursor(childA.blockContainer, { x: 10, y: 10 }),
    ).toBe(childA.blockContainer);
  });

  it("descends into the hovered column's block", () => {
    const { columnList, childA, childB } = buildColumnList();
    for (const child of [childA, childB]) {
      const rect = child.blockContainer.getBoundingClientRect();
      expect(
        getNestedBlockAtCursor(columnList, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }),
      ).toBe(child.blockContainer);
    }
  });

  it("finds a stacked child from the container gutter", () => {
    const { callout, second } = buildVerticalContainer();
    const rect = second.blockContainer.getBoundingClientRect();
    expect(
      getNestedBlockAtCursor(callout, {
        x: rect.left - 20,
        y: rect.top + rect.height / 2,
      }),
    ).toBe(second.blockContainer);
  });

  it("finds a framed block's child when moving into the side-menu gutter", () => {
    const parent = regularChild("");
    const frame = document.createElement("div");
    frame.style.padding = "12px 16px";
    const title = document.createElement("div");
    title.textContent = "Callout title";
    const child = regularChild("Callout body");
    frame.append(title, child.outer);
    parent.blockContainer.append(frame);
    parent.outer.style.width = "400px";
    mount(parent.outer);

    const rect = child.blockContainer.getBoundingClientRect();
    for (const x of [rect.left + 20, rect.left - 12, rect.left - 40]) {
      expect(
        getNestedBlockAtCursor(parent.blockContainer, {
          x,
          y: rect.top + rect.height / 2,
        }),
      ).toBe(child.blockContainer);
    }
    const titleRect = title.getBoundingClientRect();
    expect(
      getNestedBlockAtCursor(parent.blockContainer, {
        x: titleRect.left,
        y: titleRect.top + titleRect.height / 2,
      }),
    ).toBe(parent.blockContainer);
  });

  it("keeps the container when the cursor misses its children", () => {
    const { callout } = buildVerticalContainer();
    const rect = callout.getBoundingClientRect();
    expect(
      getNestedBlockAtCursor(callout, { x: rect.left, y: rect.bottom + 10 }),
    ).toBe(callout);
  });
});
