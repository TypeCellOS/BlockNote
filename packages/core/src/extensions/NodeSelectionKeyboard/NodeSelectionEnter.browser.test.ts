import { TextSelection } from "prosemirror-state";
import { expect, vi } from "vite-plus/test";

it("places the caret inside the new paragraph when Enter follows a selected image", async ({
  setupEditor,
  onTestFinished,
}) => {
  const { editor } = await setupEditor({
    initialContent: [{ id: "image", type: "image" }],
    trailingBlock: false,
  });
  editor.focus();
  editor.setTextCursorPosition("image");

  const warn = vi.spyOn(console, "warn");
  onTestFinished(() => {
    warn.mockRestore();
  });
  editor.domElement!.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );

  expect(warn).not.toHaveBeenCalledWith(
    expect.stringContaining("TextSelection endpoint not pointing into"),
  );
  expect(editor.document.map(({ type }) => type)).toEqual([
    "image",
    "paragraph",
  ]);
  editor.transact(({ selection }) => {
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.empty).toBe(true);
    expect(selection.$from.parent.type.name).toBe("paragraph");
    expect(selection.$from.parentOffset).toBe(0);
  });
  expect(editor.getTextCursorPosition().block.id).toBe(editor.document[1].id);
});
