import { expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

it("does not throw on unmount when its style element was already removed", () => {
  const editor = BlockNoteEditor.create();
  editor.mount(document.createElement("div"));

  const styleEl = [...document.head.querySelectorAll("style")].find((el) =>
    (
      el.sheet?.cssRules[0] as CSSStyleRule | undefined
    )?.selectorText?.startsWith(".placeholder-selector-"),
  );
  expect(styleEl).toBeDefined();
  // e.g. a router merging the next page's `<head>` into the current one
  styleEl!.remove();

  expect(() => editor.unmount()).not.toThrow();
});
