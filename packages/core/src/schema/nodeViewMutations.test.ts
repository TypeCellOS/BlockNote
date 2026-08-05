import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { describe, expect, it } from "vite-plus/test";

import {
  ignoreNonContentMutations,
  isNonContentMutation,
} from "./nodeViewMutations.js";

function attributeMutation(target: Node): ViewMutationRecord {
  return {
    type: "attributes",
    target,
    attributeName: "style",
  } as unknown as ViewMutationRecord;
}

function childListMutation(target: Node): ViewMutationRecord {
  return {
    type: "childList",
    target,
    addedNodes: [] as any,
    removedNodes: [] as any,
  } as unknown as ViewMutationRecord;
}

const selectionMutation = { type: "selection" } as ViewMutationRecord;

describe("isNonContentMutation", () => {
  it("never ignores selection mutations", () => {
    expect(isNonContentMutation(selectionMutation, null)).toBe(false);
    expect(
      isNonContentMutation(selectionMutation, document.createElement("div")),
    ).toBe(false);
  });

  it("ignores everything for a node view without content", () => {
    const target = document.createElement("span");
    expect(isNonContentMutation(attributeMutation(target), null)).toBe(true);
    expect(isNonContentMutation(childListMutation(target), null)).toBe(true);
  });

  it("ignores attribute mutations even inside the content DOM", () => {
    const contentDOM = document.createElement("div");
    const span = document.createElement("span");
    contentDOM.appendChild(span);

    // e.g. Dark Reader rewriting the inline style of a highlight span.
    expect(isNonContentMutation(attributeMutation(span), contentDOM)).toBe(
      true,
    );
    expect(
      isNonContentMutation(attributeMutation(contentDOM), contentDOM),
    ).toBe(true);
  });

  it("reads content mutations inside the content DOM", () => {
    const contentDOM = document.createElement("div");
    const textNode = document.createTextNode("hello");
    contentDOM.appendChild(textNode);

    // childList directly on the content DOM (e.g. a node inserted while typing).
    expect(
      isNonContentMutation(childListMutation(contentDOM), contentDOM),
    ).toBe(false);
    // characterData-style mutation on a text node inside the content DOM.
    expect(isNonContentMutation(childListMutation(textNode), contentDOM)).toBe(
      false,
    );
  });

  it("ignores content mutations outside the content DOM (node view chrome)", () => {
    const dom = document.createElement("div");
    const contentDOM = document.createElement("div");
    const chrome = document.createElement("button"); // e.g. toggle button
    dom.append(chrome, contentDOM);

    expect(isNonContentMutation(childListMutation(dom), contentDOM)).toBe(true);
    expect(isNonContentMutation(childListMutation(chrome), contentDOM)).toBe(
      true,
    );
  });
});

describe("ignoreNonContentMutations", () => {
  it("ignores non-content mutations while reading content ones", () => {
    const contentDOM = document.createElement("div");
    const span = document.createElement("span");
    contentDOM.appendChild(span);
    const nodeView: NodeView = {
      dom: document.createElement("div"),
      contentDOM,
    };

    ignoreNonContentMutations(nodeView);

    // Non-content (attribute) mutation is ignored...
    expect(nodeView.ignoreMutation!(attributeMutation(span))).toBe(true);
    // ...content mutation is read...
    expect(nodeView.ignoreMutation!(childListMutation(contentDOM))).toBe(false);
    // ...and selection is read.
    expect(nodeView.ignoreMutation!(selectionMutation)).toBe(false);
  });

  it("still defers to an existing ignoreMutation for content mutations", () => {
    const contentDOM = document.createElement("div");
    const nodeView: NodeView = {
      dom: document.createElement("div"),
      contentDOM,
      // Pretend this node view wants to ignore all of its content mutations.
      ignoreMutation: () => true,
    };

    ignoreNonContentMutations(nodeView);

    // A content mutation the filter would read is still ignored by the
    // original `ignoreMutation`.
    expect(nodeView.ignoreMutation!(childListMutation(contentDOM))).toBe(true);
    // Non-content mutations are ignored by the filter regardless.
    expect(nodeView.ignoreMutation!(attributeMutation(contentDOM))).toBe(true);
  });
});
