import { afterEach, describe, expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

describe("Toggle button accessibility", () => {
  let editor: BlockNoteEditor;

  afterEach(() => {
    editor._tiptapEditor.destroy();
    window.localStorage.clear();
  });

  it("has an accessible name and exposes its expanded state", async () => {
    editor = BlockNoteEditor.create({
      initialContent: [
        {
          id: "toggle",
          type: "toggleListItem",
          content: "Toggle",
          children: [{ type: "paragraph", content: "Child" }],
        },
      ],
    });
    const div = document.createElement("div");
    editor.mount(div);

    const button = div.querySelector<HTMLButtonElement>(".bn-toggle-button")!;
    expect(button.getAttribute("aria-label")).toBe(
      editor.dictionary.toggle_blocks.toggle_button_label,
    );
    expect(button.querySelector("svg")!.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(button.getAttribute("aria-expanded")).toBe("false");

    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("true");

    // Updating `aria-expanded` must not make ProseMirror re-render the block.
    await new Promise((resolve) => setTimeout(resolve));
    expect(div.querySelector(".bn-toggle-button")).toBe(button);

    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
