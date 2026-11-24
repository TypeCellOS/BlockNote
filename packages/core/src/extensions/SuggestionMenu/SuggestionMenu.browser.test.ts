import { describe, expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { SuggestionMenu } from "./SuggestionMenu.js";

describe("SuggestionMenu", () => {
  it.for([
    { content: "Hello world", input: "/", triggers: ["/"], expected: "/" },
    { content: "img", input: ":", triggers: ["img:"], expected: "img:" },
    { content: "hello img", input: ":", triggers: ["img:"], expected: "img:" },
    { content: "img", input: ":", triggers: [":", "img:"], expected: "img:" },
    { content: "hello", input: ":", triggers: [":", "img:"], expected: ":" },
  ])(
    "opens $expected when typing $input after $content with triggers $triggers",
    async ({ content, input, triggers, expected }, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [{ id: "paragraph", type: "paragraph", content }],
      });
      const menu = editor.getExtension(SuggestionMenu)!;
      // Register the short trigger first when it could shadow the longer one.
      for (const triggerCharacter of triggers) {
        menu.addSuggestionMenu({ triggerCharacter });
      }
      editor.setTextCursorPosition("paragraph", "end");
      expect(menu.store.state).toBeUndefined();

      editor.focus();
      await userEvent.keyboard(input);

      await expect
        .poll(() => menu.store.state)
        .toMatchObject({
          show: true,
          triggerCharacter: expected,
        });
      expect(editor.getBlock("paragraph")?.content).toEqual([
        { type: "text", text: content + input, styles: {} },
      ]);
    },
  );

  it.for([
    { triggerCharacter: "/", shouldOpen: false },
    { triggerCharacter: "@", shouldOpen: true },
  ])(
    "opens in a table with $triggerCharacter only when allowed",
    async ({ triggerCharacter, shouldOpen }, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent: [
          {
            id: "table",
            type: "table",
            content: {
              type: "tableContent",
              rows: [
                { cells: ["Cell 1", "Cell 2", "Cell 3"] },
                { cells: ["Cell 4", "Cell 5", "Cell 6"] },
              ],
            },
          },
        ],
      });
      const menu = editor.getExtension(SuggestionMenu)!;
      menu.addSuggestionMenu({
        triggerCharacter,
        // Use the same table filter as BlockNote's default suggestion menu.
        shouldOpen: shouldOpen
          ? undefined
          : (tr) => !tr.selection.$from.parent.type.isInGroup("tableContent"),
      });
      editor.setTextCursorPosition("table", "start");
      expect(menu.store.state).toBeUndefined();

      editor.focus();
      await userEvent.keyboard(triggerCharacter);

      await expect
        .poll(() => editor.domElement!.querySelector("td")?.textContent)
        .toBe(`${triggerCharacter}Cell 1`);
      if (shouldOpen) {
        await expect
          .poll(() => menu.store.state)
          .toMatchObject({
            show: true,
            triggerCharacter,
          });
      } else {
        expect(menu.store.state).toBeUndefined();
      }
    },
  );

  it("does not throw when the menu opens while not editable (#2701)", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom" });
    editor.setTextCursorPosition(editor.document[0].id, "end");

    // The menu view never gets shown, so its state stays undefined.
    editor.isEditable = false;

    expect(() =>
      editor
        .getExtension(SuggestionMenu)!
        .openSuggestionMenu("/", { deleteTriggerCharacter: true }),
    ).not.toThrow();
  });
});
