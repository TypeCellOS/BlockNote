import { SideMenuExtension } from "@blocknote/core/extensions";
import { describe, expect } from "vite-plus/test";
import { SideMenu } from "./SideMenu.js";
import { DragHandleMenu } from "./DragHandleMenu/DragHandleMenu.js";

describe("SideMenu", () => {
  describe("unit", () => {
    it("renders custom children instead of the default buttons", async ({
      setupEditor,
      page,
    }) => {
      await setupEditor({
        props: { sideMenu: false },
        children: (
          <SideMenu>
            <button>Custom action</button>
          </SideMenu>
        ),
      });
      await expect.element(page.getByRole("button")).toHaveLength(1);
      await expect
        .element(
          page.getByRole("button", { name: "Custom action", exact: true }),
        )
        .toBeVisible();
    });

    it("passes a custom drag handle menu to its button", async ({
      setupEditor,
      page,
    }) => {
      const { editor } = await setupEditor({
        props: { sideMenu: false },
        children: (
          <SideMenu
            dragHandleMenu={() => (
              <DragHandleMenu>
                <button role="menuitem">Custom action</button>
              </DragHandleMenu>
            )}
          />
        ),
      });
      editor.getExtension(SideMenuExtension)!.store.setState({
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
        .element(page.getByRole("menu").getByRole("menuitem"))
        .toHaveLength(1);
      await expect
        .element(
          page.getByRole("menuitem", { name: "Custom action", exact: true }),
        )
        .toBeVisible();
    });
  });

  describe("keyboard", () => {
    it.for(["forward", "backward"] as const)(
      "tabs %s through both controls and allows leaving",
      async (
        direction,
        { setupEditor, page, focusUntil, readAriaSnapshot },
      ) => {
        const { editor } = await setupEditor({
          props: { sideMenu: false },
          children: <SideMenu />,
        });
        editor.getExtension(SideMenuExtension)!.store.setState({
          show: true,
          block: editor.document[0],
          referencePos: new DOMRect(),
        });
        const add = page.getByRole("button", {
          name: editor.dictionary.side_menu.add_block_label,
          exact: true,
        });
        const drag = page.getByRole("button", {
          name: editor.dictionary.side_menu.drag_handle_label,
          exact: true,
        });
        const [first] = direction === "forward" ? [add, drag] : [drag, add];
        await expect.element(first).toBeVisible();
        first.element().focus();
        const before = editor.document;
        const container = first.element().closest(".bn-side-menu")!;
        const sequence = [readAriaSnapshot(first)];
        await focusUntil((active) => {
          if (!container.contains(active.element())) {
            return true;
          }
          sequence.push(readAriaSnapshot(active));
          return false;
        }, direction);
        const expected = [
          '- button "Add block":\n  - img',
          '- button "Open block menu":\n  - img',
        ];
        expect(sequence).toEqual(
          direction === "forward" ? expected : expected.toReversed(),
        );
        expect(container.contains(document.activeElement)).toBe(false);
        expect(editor.document).toEqual(before);
      },
    );
  });
});
