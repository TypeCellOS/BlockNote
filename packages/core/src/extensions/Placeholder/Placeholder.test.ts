import { expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

it("renders a placeholder without injecting placeholder CSS and unmounts cleanly", () => {
  const host = document.createElement("div");
  const editor = BlockNoteEditor.create({
    initialContent: [{ id: "empty", type: "paragraph" }],
  });

  try {
    editor.mount(host);
    expect(host.querySelector(".bn-placeholder")?.textContent).toBe(
      "Enter text or type '/' for commands",
    );
    const placeholderRules = [...document.head.querySelectorAll("style")]
      .flatMap((style) => [...(style.sheet?.cssRules ?? [])])
      .filter((rule) => rule.cssText.includes(".placeholder-selector-"));
    expect(placeholderRules).toEqual([]);
    expect(() => editor.unmount()).not.toThrow();
    expect(host.querySelector(".bn-placeholder")).toBeNull();
  } finally {
    editor._tiptapEditor.destroy();
  }
});
