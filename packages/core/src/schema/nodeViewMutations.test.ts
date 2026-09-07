import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { describe, expect, it } from "vite-plus/test";

import {
  ignoreDarkReaderMutations,
  isDarkReaderMutation,
} from "./nodeViewMutations.js";

function attributeMutation(
  target: Element,
  attributeName: string,
  oldValue: string | null = null,
): ViewMutationRecord {
  return {
    type: "attributes",
    target,
    attributeName,
    oldValue,
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

describe("isDarkReaderMutation", () => {
  it("never ignores selection mutations", () => {
    expect(isDarkReaderMutation(selectionMutation)).toBe(false);
  });

  it("ignores the attributes Dark Reader stamps on recoloured elements", () => {
    const span = document.createElement("span");
    span.setAttribute("data-darkreader-inline-bgcolor", "");
    expect(
      isDarkReaderMutation(
        attributeMutation(span, "data-darkreader-inline-bgcolor"),
      ),
    ).toBe(true);
  });

  it("ignores inline style writes that add or remove Dark Reader declarations", () => {
    const span = document.createElement("span");
    span.setAttribute(
      "style",
      "color: #f00; --darkreader-inline-color: #ff8080;",
    );
    // Added: the old value had none.
    expect(
      isDarkReaderMutation(attributeMutation(span, "style", "color: #f00;")),
    ).toBe(true);

    // Removed (the extension toggled off): only the old value had them.
    span.setAttribute("style", "color: #f00;");
    expect(
      isDarkReaderMutation(
        attributeMutation(
          span,
          "style",
          "color: #f00; --darkreader-inline-color: #ff8080;",
        ),
      ),
    ).toBe(true);
  });

  it("reads every other attribute mutation", () => {
    const span = document.createElement("span");
    span.setAttribute("style", "color: #f00;");
    expect(isDarkReaderMutation(attributeMutation(span, "style", null))).toBe(
      false,
    );
    expect(isDarkReaderMutation(attributeMutation(span, "class", null))).toBe(
      false,
    );
    expect(isDarkReaderMutation(attributeMutation(span, "data-id", null))).toBe(
      false,
    );
  });

  it("reads child list mutations anywhere in the node view", () => {
    const dom = document.createElement("div");
    const contentDOM = document.createElement("p");
    dom.append(document.createElement("button"), contentDOM);

    expect(isDarkReaderMutation(childListMutation(contentDOM))).toBe(false);
    // A browser's native paragraph split on Android and iOS inserts the new
    // paragraph next to the content DOM, not inside it.
    expect(isDarkReaderMutation(childListMutation(dom))).toBe(false);
  });
});

describe("ignoreDarkReaderMutations", () => {
  it("ignores Dark Reader writes while reading everything else", () => {
    const contentDOM = document.createElement("p");
    const span = document.createElement("span");
    span.setAttribute("style", "--darkreader-inline-color: #ff8080;");
    contentDOM.appendChild(span);
    const nodeView: NodeView = {
      dom: document.createElement("div"),
      contentDOM,
    };

    ignoreDarkReaderMutations(nodeView);

    expect(nodeView.ignoreMutation!(attributeMutation(span, "style"))).toBe(
      true,
    );
    expect(nodeView.ignoreMutation!(childListMutation(contentDOM))).toBe(false);
    expect(nodeView.ignoreMutation!(selectionMutation)).toBe(false);
  });

  it("still defers to an existing ignoreMutation", () => {
    const contentDOM = document.createElement("p");
    const nodeView: NodeView = {
      dom: document.createElement("div"),
      contentDOM,
      // Pretend this node view wants to ignore all of its mutations.
      ignoreMutation: () => true,
    };

    ignoreDarkReaderMutations(nodeView);

    expect(nodeView.ignoreMutation!(childListMutation(contentDOM))).toBe(true);
  });
});
