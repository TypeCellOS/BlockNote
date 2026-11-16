import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import { describe, expect } from "vite-plus/test";
import { DesktopFormattingToolbarController } from "./DesktopFormattingToolbarController.js";

describe("DesktopFormattingToolbarController", () => {
  describe("unit", () => {
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

  describe("keyboard", () => {
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
      expect(editor.prosemirrorState.selection.toJSON()).toEqual(
        selectionBefore,
      );
      expect(editor.document).toEqual(documentBefore);
    });
  });

  describe("integration", () => {
    it("does not steal editor focus when the default toolbar appears", async ({
      renderEditor,
      selectText,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <DesktopFormattingToolbarController />,
      });
      const textbox = page.getByRole("textbox");
      await textbox.click();
      const before = editor.document;

      selectText(editor, "Selected text");

      await expect.element(page.getByRole("toolbar")).toBeVisible();
      await expect.element(textbox).toHaveFocus();
      expect(editor.getSelectedText()).toBe("Selected text");
      expect(editor.document).toEqual(before);
    });

    it("dismisses on an outside click without stealing focus from the outside action", async ({
      renderEditor,
      selectText,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [{ type: "paragraph", content: "Selected text" }],
        props: { formattingToolbar: false },
        children: <DesktopFormattingToolbarController />,
        outside: ({ children }) => (
          <>
            <button>Outside action</button>
            {children}
          </>
        ),
      });
      await page.getByRole("textbox").click();
      selectText(editor, "Selected text");
      await expect.element(page.getByRole("toolbar")).toBeVisible();
      const before = editor.document;

      await page
        .getByRole("button", { name: "Outside action", exact: true })
        .click();

      await expect.element(page.getByRole("toolbar")).not.toBeInTheDocument();
      await expect
        .element(
          page.getByRole("button", { name: "Outside action", exact: true }),
        )
        .toHaveFocus();
      expect(editor.document).toEqual(before);
    });
  });
});
