import { SideMenuExtension } from "@blocknote/core/extensions";
import { assert, describe, expect } from "vite-plus/test";
import { MenuDropdown } from "../../../../../mantine/src/menu/Menu.js";
import { RemoveBlockItem } from "../DragHandleMenu/DefaultItems/RemoveBlockItem.js";
import { DragHandleButton } from "./DragHandleButton.js";

describe("DragHandleButton", () => {
  describe("unit", () => {
    it("sizes its menu item without a drag-handle or generic dropdown class", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: (
          <DragHandleButton dragHandleMenu={MenuDropdown}>
            <RemoveBlockItem>Delete</RemoveBlockItem>
          </DragHandleButton>
        ),
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      await page
        .getByRole("button", {
          name: editor.dictionary.side_menu.drag_handle_label,
          exact: true,
        })
        .click();
      const item = page.getByRole("menuitem", { name: "Delete", exact: true });
      await expect.element(item).toBeVisible();
      expect(getComputedStyle(item.element()).fontSize).toBe("12px");
      expect(getComputedStyle(item.element()).height).toBe("30px");
    });

    it("hides in read-only mode and responds to editability changes with an existing target", async ({
      setupEditor,
      page,
    }) => {
      const { editor, rerender } = await setupEditor({
        props: { sideMenu: false, editable: false },
        children: <DragHandleButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.drag_handle_label,
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

    it("hides until a block is available", async ({ setupEditor, page }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: <DragHandleButton />,
      });
      const trigger = page.getByRole("button", {
        name: editor.dictionary.side_menu.drag_handle_label,
        exact: true,
      });
      await expect.element(trigger).not.toBeInTheDocument();
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      await expect.element(trigger).toBeVisible();
      await expect.element(trigger).toHaveAttribute("draggable", "true");
    });

    it.for(["header_row_menuitem", "header_column_menuitem"] as const)(
      "hides %s on a paragraph",
      async (label, { setupEditor, page }) => {
        const { editor } = await setupEditor({
          tables: { headers: true },
          props: { sideMenu: false },
          children: <DragHandleButton />,
        });
        const extension = editor.getExtension(SideMenuExtension);
        assert(extension);
        extension.store.setState({
          show: true,
          block: editor.document[0],
          referencePos: new DOMRect(),
        });
        await page
          .getByRole("button", {
            name: editor.dictionary.side_menu.drag_handle_label,
            exact: true,
          })
          .click();
        await expect.element(page.getByRole("menu")).toBeVisible();
        await expect
          .element(
            page.getByRole("menuitem", {
              name: editor.dictionary.drag_handle[label],
              exact: true,
            }),
          )
          .not.toBeInTheDocument();
      },
    );
  });

  describe("integration", () => {
    it.for([false, true])(
      "moves the target to a new position, preserving children (nested: %s)",
      async (nested, { setupEditor, page, positionalMouse }) => {
        const { editor } = await setupEditor({
          initialContent: [
            {
              id: "dragged",
              type: "paragraph",
              content: "Dragged",
              children: nested
                ? [{ id: "child", type: "paragraph", content: "Child" }]
                : [],
            },
            { id: "middle", type: "paragraph", content: "Middle" },
            { id: "destination", type: "paragraph", content: "Destination" },
          ],
          props: { sideMenu: false },
          children: <DragHandleButton />,
        });
        const extension = editor.getExtension(SideMenuExtension);
        assert(extension);
        const block = editor.getBlock("dragged");
        assert(block);
        extension.store.setState({
          show: true,
          block,
          referencePos: new DOMRect(),
        });
        const handle = page.getByRole("button", {
          name: editor.dictionary.side_menu.drag_handle_label,
          exact: true,
        });
        await expect.element(handle).toBeVisible();
        const before = editor.document;
        const start = handle.element().getBoundingClientRect();
        const end = page
          .getByText("Destination", { exact: true })
          .element()
          .getBoundingClientRect();
        await positionalMouse(
          {
            type: "move",
            x: start.x + start.width / 2,
            y: start.y + start.height / 2,
          },
          { type: "down" },
          {
            type: "move",
            x: start.x + start.width / 2 + 10,
            y: start.y + start.height / 2,
            steps: 5,
          },
          { type: "move", x: end.right - 5, y: end.bottom - 2, steps: 10 },
          { type: "move", x: end.right - 5, y: end.bottom - 1 },
          { type: "up" },
        );
        await expect
          .poll(() => editor.document)
          .toEqual([before[1], before[2], before[0]]);
        await expect.element(page.getByRole("textbox")).toHaveFocus();
        // A subsequent hover must work after dragend clears the drag state.
        await page.getByText("Middle", { exact: true }).hover();
        await expect.poll(() => extension.store.state?.block.id).toBe("middle");
      },
    );

    it("keeps the side menu frozen while its popup is open and releases it on close", async ({
      setupEditor,
      page,
      pressKey,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: <DragHandleButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      await page
        .getByRole("button", {
          name: editor.dictionary.side_menu.drag_handle_label,
          exact: true,
        })
        .click();
      await expect.element(page.getByRole("menu")).toBeVisible();
      extension.hideMenuIfNotFrozen();
      expect(extension.store.state?.show).toBe(true);
      await pressKey("Escape");
      await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
      extension.hideMenuIfNotFrozen();
      expect(extension.store.state?.show).toBe(false);
    });

    it.for(["read-only", "missing block", "unmount"] as const)(
      "releases an open menu's freeze on %s and follows hover afterward",
      async (transition, { setupEditor, page }) => {
        const { editor, rerender } = await setupEditor({
          initialContent: [
            { id: "first", type: "paragraph", content: "First" },
            { id: "second", type: "paragraph", content: "Second" },
          ],
          props: { sideMenu: false },
          children: <DragHandleButton />,
        });
        const extension = editor.getExtension(SideMenuExtension);
        assert(extension);
        extension.store.setState({
          show: true,
          block: editor.document[0],
          referencePos: new DOMRect(),
        });
        await page
          .getByRole("button", {
            name: editor.dictionary.side_menu.drag_handle_label,
            exact: true,
          })
          .click();
        await expect.element(page.getByRole("menu")).toBeVisible();
        expect(extension.menuFrozen).toBe(true);
        const before = editor.document;

        switch (transition) {
          case "read-only":
            rerender({ editable: false });
            break;
          case "missing block":
            extension.store.setState(undefined);
            break;
          case "unmount":
            rerender({ children: null });
            break;
        }
        await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
        await expect.poll(() => extension.menuFrozen).toBe(false);

        rerender({ editable: true, children: <DragHandleButton /> });
        await page.getByText("Second", { exact: true }).hover();
        await expect.poll(() => extension.store.state?.block.id).toBe("second");
        expect(editor.document).toEqual(before);
      },
    );

    it.for([
      { target: "first", selected: false, remaining: ["second", "third"] },
      { target: "first", selected: true, remaining: ["third"] },
      { target: "third", selected: true, remaining: ["first", "second"] },
    ])(
      "deletes the target or the selection containing it: %j",
      async ({ target, selected, remaining }, { setupEditor, page }) => {
        const { editor } = await setupEditor({
          initialContent: [
            { id: "first", type: "paragraph", content: "First" },
            { id: "second", type: "paragraph", content: "Second" },
            { id: "third", type: "paragraph", content: "Third" },
          ],
          props: { sideMenu: false, formattingToolbar: false },
          children: <DragHandleButton />,
        });
        if (selected) {
          editor.setSelection("first", "second");
        }
        const extension = editor.getExtension(SideMenuExtension);
        assert(extension);
        const block = editor.getBlock(target);
        assert(block);
        extension.store.setState({
          show: true,
          block,
          referencePos: new DOMRect(),
        });
        const expected = editor.document.filter((block) =>
          remaining.includes(block.id),
        );
        await page
          .getByRole("button", {
            name: editor.dictionary.side_menu.drag_handle_label,
            exact: true,
          })
          .click();
        await page
          .getByRole("menuitem", {
            name: editor.dictionary.drag_handle.delete_menuitem,
            exact: true,
          })
          .click();
        expect(editor.document).toEqual(expected);
        await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
      },
    );

    it.for(["textColor", "backgroundColor"] as const)(
      "changes only the target block's %s",
      async (color, { setupEditor, page }) => {
        const { editor } = await setupEditor({
          initialContent: [
            { id: "target", type: "paragraph", content: "Target" },
            { id: "other", type: "paragraph", content: "Other" },
          ],
          props: { sideMenu: false },
          children: <DragHandleButton />,
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
        const [target, other] = editor.document;
        await page
          .getByRole("button", {
            name: editor.dictionary.side_menu.drag_handle_label,
            exact: true,
          })
          .click();
        await page
          .getByRole("menuitem", {
            name: editor.dictionary.drag_handle.colors_menuitem,
            exact: true,
          })
          .hover();
        const choice = page
          .getByRole("menuitem", {
            name: editor.dictionary.color_picker.colors.gray,
          })
          .nth(color === "textColor" ? 0 : 1);
        await expect.element(choice).toBeVisible();
        await choice.click();
        expect(editor.getBlock("target")).toEqual({
          ...target,
          props: { ...target.props, [color]: "gray" },
        });
        expect(editor.getBlock("other")).toEqual(other);
      },
    );

    it("toggles the row header without changing the table cells", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        tables: { headers: true },
        initialContent: [
          {
            id: "table",
            type: "table",
            content: {
              type: "tableContent",
              rows: [{ cells: ["A", "B"] }, { cells: ["C", "D"] }],
            },
          },
        ],
        props: { sideMenu: false },
        children: <DragHandleButton />,
      });
      const original = editor.getBlock("table");
      assert(original?.type === "table");
      for (const expected of [1, undefined]) {
        const extension = editor.getExtension(SideMenuExtension);
        assert(extension);
        const block = editor.getBlock("table");
        assert(block);
        extension.store.setState({
          show: true,
          block,
          referencePos: new DOMRect(),
        });
        await page
          .getByRole("button", {
            name: editor.dictionary.side_menu.drag_handle_label,
            exact: true,
          })
          .click();
        await page
          .getByRole("menuitem", {
            name: editor.dictionary.drag_handle.header_row_menuitem,
            exact: true,
          })
          .click();
        const table = editor.getBlock("table");
        assert(table?.type === "table");
        expect(table.content.headerRows).toBe(expected);
        expect(table.content.rows).toEqual(original.content.rows);
        await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
      }
    });

    it("toggles the column header without changing the table cells", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        tables: { headers: true },
        initialContent: [
          {
            id: "table",
            type: "table",
            content: {
              type: "tableContent",
              rows: [{ cells: ["A", "B"] }, { cells: ["C", "D"] }],
            },
          },
        ],
        props: { sideMenu: false },
        children: <DragHandleButton />,
      });
      const original = editor.getBlock("table");
      assert(original?.type === "table");
      for (const expected of [1, undefined]) {
        const extension = editor.getExtension(SideMenuExtension);
        assert(extension);
        const block = editor.getBlock("table");
        assert(block);
        extension.store.setState({
          show: true,
          block,
          referencePos: new DOMRect(),
        });
        await page
          .getByRole("button", {
            name: editor.dictionary.side_menu.drag_handle_label,
            exact: true,
          })
          .click();
        await page
          .getByRole("menuitem", {
            name: editor.dictionary.drag_handle.header_column_menuitem,
            exact: true,
          })
          .click();
        const table = editor.getBlock("table");
        assert(table?.type === "table");
        expect(table.content.headerCols).toBe(expected);
        expect(table.content.rows).toEqual(original.content.rows);
        await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
      }
    });
  });

  describe("aria", () => {
    it("exposes its accessible name and popup relationship", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false, formattingToolbar: false },
        children: <DragHandleButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.drag_handle_label,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      await expect.element(button).toHaveAttribute("aria-haspopup", "menu");
      await expect.element(button).toHaveAttribute("aria-expanded", "false");
      await button.click();
      const menu = page.getByRole("menu");
      await expect.element(menu).toBeVisible();
      await expect.element(button).toHaveAttribute("aria-expanded", "true");
      expect(button.element().getAttribute("aria-controls")).toBe(
        menu.element().id,
      );
    });

    it("exposes the delete action as a named menu item", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: <DragHandleButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      await page
        .getByRole("button", {
          name: editor.dictionary.side_menu.drag_handle_label,
          exact: true,
        })
        .click();
      await expect
        .element(
          page.getByRole("menuitem", {
            name: editor.dictionary.drag_handle.delete_menuitem,
            exact: true,
          }),
        )
        .toMatchAriaInlineSnapshot(`- menuitem "Delete"`);
    });
  });

  describe("axe", () => {
    it("checks the closed drag handle trigger", async ({
      setupEditor,
      page,
      runAxe,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false, formattingToolbar: false },
        children: <DragHandleButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.drag_handle_label,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      expect((await runAxe(button)).violations).toEqual([]);
    });

    it("checks the color submenu trigger and open dropdown", async ({
      setupEditor,
      page,
      runAxe,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: <DragHandleButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      await page
        .getByRole("button", {
          name: editor.dictionary.side_menu.drag_handle_label,
          exact: true,
        })
        .click();
      const item = page.getByRole("menuitem", {
        name: editor.dictionary.drag_handle.colors_menuitem,
        exact: true,
      });
      await expect.element(item).toBeVisible();
      expect((await runAxe(item)).violations).toEqual([]);

      await item.hover();
      const submenu = page.getByRole("menu").last();
      await expect
        .element(
          submenu
            .getByRole("menuitem", {
              name: editor.dictionary.color_picker.colors.gray,
            })
            .first(),
        )
        .toBeVisible();
      expect((await runAxe(submenu)).violations).toEqual([]);
    });

    it("checks the open menu for only the known Mantine placeholder violation", async ({
      setupEditor,
      page,
      runAxe,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: <DragHandleButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      await page
        .getByRole("button", {
          name: editor.dictionary.side_menu.drag_handle_label,
          exact: true,
        })
        .click();
      await expect.element(page.getByRole("menu")).toBeVisible();
      // Same known Mantine issue recorded in
      // ../../FormattingToolbar/DefaultSelects/BlockTypeSelect.browser.test.tsx.
      // Match the exact check so additional violations still fail.
      const { violations } = await runAxe(page.getByRole("menu"));
      expect(violations).toMatchObject([
        {
          id: "aria-required-children",
          nodes: [
            {
              any: [
                {
                  id: "aria-required-children",
                  data: { messageKey: "unallowed", values: "div[tabindex]" },
                },
              ],
              all: [],
              none: [],
            },
          ],
        },
      ]);
    });
  });

  describe("keyboard", () => {
    it("shows a visible keyboard focus indicator", async ({
      setupEditor,
      page,
      pressKey,
      captureFocusOutline,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false, formattingToolbar: false },
        children: <DragHandleButton />,
      });
      const extension = editor.getExtension(SideMenuExtension);
      assert(extension);
      extension.store.setState({
        show: true,
        block: editor.document[0],
        referencePos: new DOMRect(),
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.side_menu.drag_handle_label,
        exact: true,
      });
      await expect.element(button).toBeVisible();
      await page.getByRole("textbox").click();
      const compareFocusOutline = captureFocusOutline(button);
      await pressKey("Tab");
      await expect.element(button).toHaveFocus();
      await compareFocusOutline();
    });

    it.for(["Enter", "Space"])(
      "opens with %s and dismisses with Escape without changing the document",
      async (key, { setupEditor, page, pressKey }) => {
        const { editor } = await setupEditor({
          props: { sideMenu: false },
          children: <DragHandleButton />,
        });
        const extension = editor.getExtension(SideMenuExtension);
        assert(extension);
        extension.store.setState({
          show: true,
          block: editor.document[0],
          referencePos: new DOMRect(),
        });
        const trigger = page.getByRole("button", {
          name: editor.dictionary.side_menu.drag_handle_label,
          exact: true,
        });
        await expect.element(trigger).toBeVisible();
        trigger.element().focus();
        const before = editor.document;
        await pressKey(key);
        await expect.element(page.getByRole("menu")).toBeVisible();
        await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
        await pressKey("Escape");
        await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
        await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
        await expect.element(trigger).toHaveFocus();
        expect(editor.document).toEqual(before);
      },
    );

    it("deletes with Enter and closes the menu", async ({
      setupEditor,
      page,
      pressKey,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "target", type: "paragraph", content: "Target" },
          { id: "keep", type: "paragraph", content: "Keep" },
        ],
        props: { sideMenu: false },
        children: <DragHandleButton />,
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
      const expected = editor.document.slice(1);
      const trigger = page.getByRole("button", {
        name: editor.dictionary.side_menu.drag_handle_label,
        exact: true,
      });
      await expect.element(trigger).toBeVisible();
      trigger.element().focus();
      await pressKey("Enter");
      await expect.element(page.getByRole("menu")).toBeVisible();
      await pressKey("ArrowDown");
      await expect
        .element(
          page.getByRole("menuitem", {
            name: editor.dictionary.drag_handle.delete_menuitem,
            exact: true,
          }),
        )
        .toHaveFocus();
      await pressKey("Enter");
      expect(editor.document).toEqual(expected);
      await expect.element(page.getByRole("menu")).not.toBeInTheDocument();
    });
  });
});
