import {
  BlockNoteView,
  components,
  ShadCNDefaultComponents,
  type ShadCNComponents,
} from "@blocknote/shadcn";
import { type ComponentProps, useState } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/shadcn/style.css";
import "@examples/01-basic/09-shadcn/tailwind.css";
import { afterEach, expect } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "../../../../tests/src/commands/transport.js";
import { mouseSequence } from "../../../../tests/src/utils/mouse.js";

afterEach(cleanup);

function MenuFixture({
  dir,
  overrides,
  editor,
}: {
  dir: "ltr" | "rtl";
  overrides?: Partial<ShadCNComponents>;
  editor: BlockNoteEditor;
}) {
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(
    null,
  );
  const C = components.Generic.Menu;
  return (
    <BlockNoteView editor={editor} dir={dir} shadCNComponents={overrides}>
      <div ref={setPortalElement} style={{ padding: 200 }}>
        <C.Root
          portalElement={portalElement}
          position={dir === "rtl" ? "right" : "left"}
        >
          <C.Trigger>
            <button>Open</button>
          </C.Trigger>
          <C.Dropdown>
            <C.Root
              portalElement={portalElement}
              sub
              position={dir === "rtl" ? "left" : "right"}
            >
              <C.Trigger sub>
                <C.Item subTrigger>Colors</C.Item>
              </C.Trigger>
              <C.Dropdown sub>
                <C.Item>Red</C.Item>
              </C.Dropdown>
            </C.Root>
          </C.Dropdown>
        </C.Root>
      </div>
    </BlockNoteView>
  );
}

// Mantine currently hardcodes ArrowRight=open/ArrowLeft=close. Its pointer
// placement is covered in rtl.test.tsx; keyboard mirroring needs upstream support.
it("shadcn opens RTL submenus to the left and closes them to the right", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({ mountType: false });
  await render(<MenuFixture editor={editor} dir="rtl" />);
  const trigger = page.getByRole("button", { name: "Open", exact: true });
  await userEvent.click(trigger);
  await mouseSequence([{ type: "move", x: 5, y: 5 }]);
  await expect
    .poll(() => page.getByRole("menu").element().getBoundingClientRect().left)
    .toBeGreaterThanOrEqual(trigger.element().getBoundingClientRect().right);
  const colors = page.getByRole("menuitem", { name: "Colors", exact: true });
  await userEvent.keyboard("{ArrowDown}");
  await expect.element(colors).toHaveFocus();
  await userEvent.keyboard("{ArrowLeft}");
  const red = page.getByRole("menuitem", { name: "Red", exact: true });
  await expect.element(red).toHaveFocus();
  await expect
    .poll(
      () =>
        red.element().closest('[role="menu"]')!.getBoundingClientRect().right,
    )
    .toBeLessThanOrEqual(colors.element().getBoundingClientRect().left + 1);
  await userEvent.keyboard("{ArrowRight}");
  await expect.element(colors).toHaveFocus();
});

it("shadcn preserves physical menu placement with custom components", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor({ mountType: false });
  function Content(
    props: ComponentProps<
      typeof ShadCNDefaultComponents.DropdownMenu.DropdownMenuContent
    >,
  ) {
    return (
      <ShadCNDefaultComponents.DropdownMenu.DropdownMenuContent
        {...props}
        data-testid="custom-menu"
      />
    );
  }
  await render(
    <MenuFixture
      editor={editor}
      dir="ltr"
      overrides={{
        DropdownMenu: {
          ...ShadCNDefaultComponents.DropdownMenu,
          DropdownMenuContent: Content,
        },
      }}
    />,
  );
  const trigger = page.getByRole("button", { name: "Open", exact: true });
  await userEvent.click(trigger);
  await expect
    .poll(() => page.getByRole("menu").element().getBoundingClientRect().right)
    .toBeLessThanOrEqual(trigger.element().getBoundingClientRect().left);
});
