import { SideMenuExtension, SuggestionMenu } from "@blocknote/core/extensions";
import { assert, describe, expect } from "vite-plus/test";
import { AddBlockButton } from "./AddBlockButton.js";

describe("AddBlockButton", () => {
  describe("unit", () => {
    it("uses side-menu icon and hover styles without a side-menu ancestor", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        props: {
          sideMenu: false,
        },
        children: <AddBlockButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.add_block_label,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      button
        .element()
        .style.setProperty("--bn-side-menu-icon-color", "#445566");
      button
        .element()
        .style.setProperty("--bn-side-menu-hover-background", "#ffeecc");
      expect(getComputedStyle(button.element()).backgroundColor).toBe(
        "rgba(0, 0, 0, 0)",
      );
      const icon = button.element().querySelector("svg");
      assert(icon);
      expect(getComputedStyle(icon).color).toBe("rgb(68, 85, 102)");
      expect(getComputedStyle(icon).width).toBe("22px");
      await button.hover();
      await expect
        .poll(() => getComputedStyle(button.element()).backgroundColor)
        .toBe("rgb(255, 238, 204)");
    });

    it("hides in read-only mode and responds to editability changes with an existing target", async ({
      setupEditor,
      page,
    }) => {
      const { editor, rerender } = await setupEditor({
        props: { sideMenu: false, editable: false },
        children: <AddBlockButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.add_block_label,
        exact: true,
      });
      await expect.element(button).not.toBeInTheDocument();
      const before = editor.document;
      rerender({ editable: true });
      await expect.element(button).toBeVisible();
      rerender({ editable: false });
      await expect.element(button).not.toBeInTheDocument();
      expect(editor.document).toEqual(before);
    });

    it("hides until a block is targeted", async ({ setupEditor, page }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: <AddBlockButton />,
      });
      await expect
        .element(
          page.getByRole("button", {
            name: editor.dictionary.side_menu.add_block_label,
            exact: true,
          }),
        )
        .not.toBeInTheDocument();
    });
  });

  describe("integration", () => {
    it("reuses an empty paragraph and opens the slash menu there", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "target", type: "paragraph" },
          { id: "next", type: "paragraph", content: "Next" },
        ],
        props: { sideMenu: false },
        children: <AddBlockButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      const block = editor.getBlock("target");
      assert(block);
      extension.store.setState({
        show: true,
        block,
        referencePos: new DOMRect(),
      });
      const before = editor.document;
      await page
        .getByRole("button", {
          name: editor.dictionary.side_menu.add_block_label,
          exact: true,
        })
        .click();
      expect(editor.document).toEqual(before);
      expect(editor.getTextCursorPosition().block.id).toBe("target");
      const suggestionMenu = editor.getExtension(SuggestionMenu);
      assert(suggestionMenu);
      await expect.poll(() => suggestionMenu.store.state?.show).toBe(true);
    });

    it("inserts a paragraph immediately after a nonempty target and opens the slash menu there", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "target", type: "paragraph", content: "Target" },
          { id: "next", type: "paragraph", content: "Next" },
        ],
        props: { sideMenu: false },
        children: <AddBlockButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      const block = editor.getBlock("target");
      assert(block);
      extension.store.setState({
        show: true,
        block,
        referencePos: new DOMRect(),
      });
      const [target, next] = editor.document;
      await page
        .getByRole("button", {
          name: editor.dictionary.side_menu.add_block_label,
          exact: true,
        })
        .click();
      expect(editor.document).toHaveLength(3);
      expect(editor.document[0]).toEqual(target);
      expect(editor.document[2]).toEqual(next);
      expect(editor.document[1]).toMatchObject({
        type: "paragraph",
        content: [],
      });
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.document[1].id,
      );
      const suggestionMenu = editor.getExtension(SuggestionMenu);
      assert(suggestionMenu);
      await expect.poll(() => suggestionMenu.store.state?.show).toBe(true);
    });
  });

  describe("aria", () => {
    it("exposes its accessible name", async ({ setupEditor, page }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false, formattingToolbar: false },
        children: <AddBlockButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.add_block_label,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      await expect.element(button).toMatchAriaInlineSnapshot(`
        - button "Add block":
          - img
      `);
    });
  });

  describe("axe", () => {
    it("has no automated accessibility violations", async ({
      setupEditor,
      page,
      runAxe,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false, formattingToolbar: false },
        children: <AddBlockButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.add_block_label,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      expect((await runAxe(button)).violations).toEqual([]);
    });
  });

  describe("keyboard", () => {
    it.for(["Enter", "Space"])(
      "activates with %s and opens suggestions at the target",
      async (key, { setupEditor, page, pressKey }) => {
        const { editor } = await setupEditor({
          props: { sideMenu: false, formattingToolbar: false },
          children: <AddBlockButton />,
        });
        const extension = editor.getExtension(SideMenuExtension);
        assert(extension);
        extension.store.setState({
          show: true,
          block: editor.document[0],
          referencePos: new DOMRect(),
        });
        const button = page.getByRole("button", {
          name: editor.dictionary.side_menu.add_block_label,
          exact: true,
        });
        await expect.element(button).toBeVisible();
        button.element().focus();
        const before = editor.document;
        await pressKey(key);
        const suggestionMenu = editor.getExtension(SuggestionMenu);
        assert(suggestionMenu);
        await expect.poll(() => suggestionMenu.store.state?.show).toBe(true);
        expect(editor.document).toEqual(before);
        expect(editor.getTextCursorPosition().block.id).toBe(before[0].id);
        await expect.element(page.getByRole("textbox")).toHaveFocus();
      },
    );
    it("shows a visible keyboard focus indicator", async ({
      setupEditor,
      page,
      pressKey,
      captureFocusOutline,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false, formattingToolbar: false },
        children: <AddBlockButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.add_block_label,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      await page.getByRole("textbox").click();
      const compareFocusOutline = captureFocusOutline(button);
      await pressKey("Tab");
      await expect.element(button).toHaveFocus();
      await compareFocusOutline();
    });
  });
});
