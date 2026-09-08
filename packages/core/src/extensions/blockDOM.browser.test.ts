import { describe, expect, it } from "vite-plus/test";

import {
  getBlockFromElement,
  getDraggableBlockFromElement,
} from "./blockDOM.js";

function isDraggable(type: string) {
  return type !== "lockedBlock" && type !== "column";
}

// These are pure DOM walks (`closest`/`querySelector` over the block chrome),
// so we build detached trees rather than booting an editor. Only `view.dom` is
// read, as the boundary for the upward walk. No layout is involved, but
// the unit under test is the DOM API itself, so it runs against a real
// browser engine rather than jsdom's re-implementation of it.

/** Builds the `blockOuter > blockContainer > blockContent` chrome BlockNote
 * renders around every regular block. */
function regularBlock(
  id: string,
  contentType: string,
): { outer: HTMLElement; blockContainer: HTMLElement; content: HTMLElement } {
  const outer = document.createElement("div");
  outer.setAttribute("data-node-type", "blockOuter");

  const blockContainer = document.createElement("div");
  blockContainer.setAttribute("data-node-type", "blockContainer");
  blockContainer.setAttribute("data-id", id);

  const content = document.createElement("div");
  content.setAttribute("data-content-type", contentType);

  blockContainer.append(content);
  outer.append(blockContainer);
  return { outer, blockContainer, content };
}

/** Nests `child` under `parent` in a `blockGroup`, as list nesting does. */
function nest(parent: HTMLElement, child: HTMLElement) {
  const group = document.createElement("div");
  group.setAttribute("data-node-type", "blockGroup");
  group.append(child);
  parent.append(group);
}

function viewWith(root: HTMLElement) {
  const dom = document.createElement("div");
  dom.append(root);
  return { dom };
}

describe("getDraggableBlockFromElement", () => {
  it("returns the block container for a regular block", () => {
    const { outer, blockContainer, content } = regularBlock("a", "paragraph");

    expect(
      getDraggableBlockFromElement(content, viewWith(outer), isDraggable),
    ).toEqual({
      node: blockContainer,
      id: "a",
      type: "paragraph",
    });
  });

  it("skips a block whose type opts out of dragging", () => {
    const { outer, content } = regularBlock("a", "lockedBlock");

    expect(
      getDraggableBlockFromElement(content, viewWith(outer), isDraggable),
    ).toBeUndefined();
  });

  it("falls through to the nearest draggable ancestor", () => {
    const parent = regularBlock("parent", "paragraph");
    const child = regularBlock("child", "lockedBlock");
    nest(parent.blockContainer, child.outer);

    // Dragging from inside the locked child should hand back the parent's
    // handle rather than no handle at all.
    expect(
      getDraggableBlockFromElement(
        child.content,
        viewWith(parent.outer),
        isDraggable,
      ),
    ).toEqual({ node: parent.blockContainer, id: "parent", type: "paragraph" });
  });

  it("reads the block's own content type, not a nested block's", () => {
    const parent = regularBlock("parent", "lockedBlock");
    const child = regularBlock("child", "paragraph");
    nest(parent.blockContainer, child.outer);

    // `parent`'s own content element precedes the nested `blockGroup`, so the
    // first `[data-content-type]` match inside it must be "lockedBlock".
    expect(
      getDraggableBlockFromElement(
        parent.content,
        viewWith(parent.outer),
        isDraggable,
      ),
    ).toBeUndefined();
  });

  it("returns a container block only when its type is draggable", () => {
    const column = document.createElement("div");
    column.setAttribute("data-node-type", "column");
    column.setAttribute("data-id", "col");

    expect(
      getDraggableBlockFromElement(column, viewWith(column), isDraggable),
    ).toBeUndefined();

    expect(
      getDraggableBlockFromElement(column, viewWith(column), () => true),
    ).toEqual({ node: column, id: "col", type: "column" });
  });
});

it("resolves a locked block's identity without applying drag policy", () => {
  const { outer, content, blockContainer } = regularBlock(
    "locked",
    "lockedBlock",
  );
  expect(getBlockFromElement(content, viewWith(outer))).toEqual({
    node: blockContainer,
    id: "locked",
    type: "lockedBlock",
  });
});

it("does not resolve blocks outside this editor", () => {
  const { content } = regularBlock("outside", "paragraph");
  expect(
    getBlockFromElement(content, viewWith(document.createElement("div"))),
  ).toBeUndefined();
});

it("ignores the duplicate ID on ordinary block chrome", () => {
  const { outer, content, blockContainer } = regularBlock("a", "paragraph");
  outer.setAttribute("data-id", "a");
  expect(getBlockFromElement(content, viewWith(outer))?.node).toBe(
    blockContainer,
  );
});

it("does not resolve a block owned by an embedded editor", () => {
  const nested = regularBlock("nested", "paragraph");
  const nestedView = viewWith(nested.outer);
  nestedView.dom.className = "bn-editor";
  const outerView = viewWith(nestedView.dom);
  outerView.dom.className = "bn-editor";
  expect(getBlockFromElement(nested.content, outerView)).toBeUndefined();
  expect(getBlockFromElement(nested.content, nestedView)?.id).toBe("nested");
});
