import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import { describe, expect } from "vite-plus/test";
import { DesktopFormattingToolbarController } from "./DesktopFormattingToolbarController.js";

describe("DesktopFormattingToolbarController", () => {
  it("mounts its custom toolbar while the extension requests it and unmounts it on dismissal", async ({
    renderEditor,
    selectText,
    page,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        { id: "text", type: "paragraph", content: "Selected text" },
      ],
      props: { formattingToolbar: false },
      children: (
        <DesktopFormattingToolbarController
          formattingToolbar={() => (
            <div role="toolbar">
              <button>Custom action</button>
            </div>
          )}
        />
      ),
    });
    const extension = editor.getExtension(FormattingToolbarExtension)!;
    const toolbar = page.getByRole("toolbar");
    selectText(editor, "Selected text");
    extension.store.setState(false);
    await expect.element(toolbar).not.toBeInTheDocument();

    extension.store.setState(true);

    await expect
      .element(
        toolbar.getByRole("button", { name: "Custom action", exact: true }),
      )
      .toBeVisible();

    extension.store.setState(false);

    await expect.element(toolbar).not.toBeInTheDocument();
  });

  it("dismisses with Escape and restores editor focus without changing its selection or document", async ({
    renderEditor,
    selectText,
    commands,
    page,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        { id: "text", type: "paragraph", content: "Selected text" },
      ],
      props: { formattingToolbar: false },
      children: (
        <DesktopFormattingToolbarController
          formattingToolbar={() => (
            <div role="toolbar">
              <button>Custom action</button>
            </div>
          )}
        />
      ),
    });
    selectText(editor, "Selected text");
    await page
      .getByRole("button", { name: "Custom action", exact: true })
      .click();
    const documentBefore = editor.document;
    const selectionBefore = editor.prosemirrorState.selection.toJSON();

    await commands.pressKey("Escape");

    expect(editor.getExtension(FormattingToolbarExtension)!.store.state).toBe(
      false,
    );
    await expect.element(page.getByRole("toolbar")).not.toBeInTheDocument();
    await expect.element(page.getByRole("textbox")).toHaveFocus();
    expect(editor.prosemirrorState.selection.toJSON()).toEqual(selectionBefore);
    expect(editor.document).toEqual(documentBefore);
  });

  it("renders its toolbar into the supplied portal", async ({
    renderEditor,
    selectText,
    page,
    onTestFinished,
  }) => {
    const portal = document.createElement("div");
    document.body.append(portal);
    onTestFinished(() => portal.remove());
    const { editor } = await renderEditor({
      initialContent: [
        { id: "text", type: "paragraph", content: "Selected text" },
      ],
      props: { formattingToolbar: false },
      children: (
        <DesktopFormattingToolbarController
          portalElement={portal}
          formattingToolbar={() => (
            <div role="toolbar">
              <button>Custom action</button>
            </div>
          )}
        />
      ),
    });

    selectText(editor, "Selected text");

    await expect.element(page.getByRole("toolbar")).toBeVisible();
    expect(portal.contains(page.getByRole("toolbar").element())).toBe(true);
  });
});
