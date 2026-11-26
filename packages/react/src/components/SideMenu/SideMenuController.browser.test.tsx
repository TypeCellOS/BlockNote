import { SideMenuExtension } from "@blocknote/core/extensions";
import { assert, describe, expect } from "vite-plus/test";
import { SideMenuController } from "./SideMenuController.js";

describe("SideMenuController", () => {
  describe("unit", () => {
    it("mounts its custom menu when requested and unmounts it on dismissal", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "target", type: "paragraph", content: "Target" },
        ],
        props: { sideMenu: false },
        children: (
          <SideMenuController sideMenu={() => <button>Custom action</button>} />
        ),
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      const button = page.getByRole("button", {
        name: "Custom action",
        exact: true,
      });
      await expect.element(button).not.toBeInTheDocument();
      const block = editor.getBlock("target");
      assert(block);
      extension.store.setState({
        show: true,
        block,
        referencePos: new DOMRect(),
      });
      await expect.element(button).toBeVisible();
      extension.hideMenuIfNotFrozen();
      await expect.element(button).not.toBeInTheDocument();
    });

    it("renders its custom menu into the supplied portal", async ({
      setupEditor,
      page,
      onTestFinished,
    }) => {
      const portal = document.createElement("div");
      document.body.append(portal);
      onTestFinished(() => portal.remove());
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: (
          <SideMenuController
            portalElement={portal}
            sideMenu={() => <button>Custom action</button>}
          />
        ),
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: "Custom action",
        exact: true,
      });
      await expect.element(button).toBeVisible();
      expect(portal.contains(button.element())).toBe(true);
    });
  });

  describe("integration", () => {
    it("shows on block hover without stealing editor focus or changing the document", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Target" }],
      });
      await page.getByRole("textbox").click();
      const before = editor.document;
      await page.getByText("Target", { exact: true }).hover();
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.side_menu.drag_handle_label,
            exact: true,
          }),
        )
        .toBeVisible();
      await expect.element(page.getByRole("textbox")).toHaveFocus();
      expect(editor.document).toEqual(before);
    });

    it("follows editability changes without exposing stale controls", async ({
      setupEditor,
      page,
    }) => {
      const { editor, rerender } = await setupEditor({
        initialContent: [{ type: "paragraph", content: "Target" }],
        props: { editable: false },
      });
      const handle = page.getByRole("button", {
        name: editor.dictionary.side_menu.drag_handle_label,
        exact: true,
      });
      const before = editor.document;
      await page.getByText("Target", { exact: true }).hover();
      await expect.element(handle).not.toBeInTheDocument();
      rerender({ editable: true });
      await page.getByRole("textbox").click();
      await page.getByText("Target", { exact: true }).hover();
      await expect.element(handle).toBeVisible();
      rerender({ editable: false });
      await expect.element(handle).not.toBeInTheDocument();
      await page.getByText("Target", { exact: true }).hover();
      await expect.element(handle).not.toBeInTheDocument();
      expect(editor.document).toEqual(before);
    });
  });
});
