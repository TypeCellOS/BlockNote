import { expect, it } from "vite-plus/test";

import { isBlockWrapperMutation } from "./createBlockNodeView.js";

it("ignores only attributes on the structural wrappers", () => {
  const dom = document.createElement("div");
  const innerWrapper = dom.appendChild(document.createElement("div"));
  const content = innerWrapper.appendChild(document.createElement("a"));
  const text = content.appendChild(document.createTextNode("Before"));
  const observer = new MutationObserver(() => {});
  observer.observe(dom, {
    subtree: true,
    attributes: true,
    childList: true,
    characterData: true,
  });
  try {
    dom.setAttribute("data-ui-state", "active");
    innerWrapper.setAttribute("class", "ui-active");
    content.setAttribute("href", "https://example.com/after");
    text.data = "After";
    innerWrapper.appendChild(document.createElement("p"));

    expect(
      observer
        .takeRecords()
        .map((mutation) => isBlockWrapperMutation(mutation, dom, innerWrapper)),
    ).toEqual([true, true, false, false, false]);
    expect(
      isBlockWrapperMutation(
        { type: "selection", target: dom },
        dom,
        innerWrapper,
      ),
    ).toBe(false);
  } finally {
    observer.disconnect();
  }
});
