import type { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/ariakit/style.css";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbarController,
  type PortalElementsMap,
} from "@blocknote/react";
import "@blocknote/shadcn/style.css";
import { flushSync } from "react-dom";
import { describe, expect, vi } from "vite-plus/test";
import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { selectText } from "../../commands/node/selectText.js";
import { userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";
import { createPortalTarget } from "./portalTarget.js";

// The menus and popovers a floating component opens (here: the formatting
// toolbar's block type menu) render inside that component's wrapper, next to
// the component, not in the editor container. These tests pin what that buys
// the user: the menu hides together with its toolbar, it travels with the
// toolbar when `portalElements` relocates it, and the toolbar still fades out
// showing its content. They run per skin because each skin brings its own
// menu implementation, and Mantine's would hide its menu on its own
// (`hideDetached`) while Ariakit's and shadcn's would stay orphaned on screen.

const skins = [
  { name: "mantine" },
  { name: "ariakit" },
  { name: "shadcn" },
] as const;

async function renderEditor(
  setupEditor: SetupEditor,
  skin: (typeof skins)[number]["name"],
  portalElements?: PortalElementsMap,
) {
  const { editor } = await setupEditor({
    skin,
    props: { portalElements },
    initialContent: Array.from({ length: 12 }, (_, i) => ({
      id: `paragraph-${i}`,
      type: "paragraph" as const,
      content: `Paragraph ${i}`,
    })),
    // A short scroll container, so a selection can be scrolled out of view.
    outside: ({ children }) => (
      <div data-test="scroller" style={{ height: 160, overflow: "auto" }}>
        {children}
      </div>
    ),
  });
  return editor;
}

/** Selects text in the first paragraph, which shows the formatting toolbar. */
function showFormattingToolbar(editor: BlockNoteEditor) {
  editor.focus();
  selectText(editor, "Paragraph", { startBlockId: "paragraph-0" });
  return waitForSelector(".bn-formatting-toolbar");
}

/**
 * Opens the block type menu from the toolbar's first control. Ariakit and
 * shadcn render the menu as a listbox, Mantine as a menu.
 */
async function openBlockTypeMenu(toolbar: HTMLElement) {
  await userEvent.click(toolbar.querySelector("button, [role=combobox]")!);
  return waitForSelector("[role=menu], [role=listbox]");
}

function isVisible(element: Element | null) {
  if (!element?.isConnected) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    getComputedStyle(element).visibility !== "hidden"
  );
}

describe.each(skins)(
  "Menus opened from a floating component ($name)",
  ({ name }) => {
    it("render inside the component's wrapper and hide with it", async ({
      setupEditor,
    }) => {
      const editor = await renderEditor(setupEditor, name);
      const toolbar = await showFormattingToolbar(editor);
      const menu = await openBlockTypeMenu(toolbar);
      await expect.poll(() => isVisible(menu)).toBe(true);

      const wrapper = toolbar.parentElement!;
      expect(wrapper.contains(menu)).toBe(true);
      expect(toolbar.contains(menu)).toBe(false);

      // Scroll the selection out of view: the toolbar's reference is hidden, so
      // its wrapper gets `visibility: hidden`, and the menu must go with it.
      const scroller = document.querySelector<HTMLElement>(
        "[data-test=scroller]",
      )!;
      scroller.scrollTop = scroller.scrollHeight;
      scroller.dispatchEvent(new Event("scroll"));

      // The browser then drops focus from the hidden menu, which the
      // formatting toolbar reads as the user leaving and unmounts on; either
      // way the menu is not visible.
      await vi.waitFor(() => {
        const currentWrapper = toolbar.parentElement;
        expect(
          currentWrapper === null ||
            getComputedStyle(currentWrapper).visibility === "hidden",
        ).toBe(true);
      });
      await expect.poll(() => isVisible(menu)).toBe(false);
    });

    it("follow the component when portalElements relocates it", async ({
      onTestFinished,
      setupEditor,
    }) => {
      const target = createPortalTarget(onTestFinished, "portal-target");
      const editor = await renderEditor(setupEditor, name, { default: target });
      const toolbar = await showFormattingToolbar(editor);
      const menu = await openBlockTypeMenu(toolbar);

      expect(target.contains(toolbar)).toBe(true);
      expect(target.contains(menu)).toBe(true);
      expect(document.querySelector(".bn-container")!.contains(menu)).toBe(
        false,
      );
    });
  },
);

describe("A floating component that closes", () => {
  it("still shows its content while fading out", async ({ setupEditor }) => {
    const closeDuration = 200;
    const { editor } = await setupEditor({
      initialContent: [
        { id: "paragraph-0", type: "paragraph", content: "Paragraph" },
      ],
      props: { formattingToolbar: false },
      children: (
        <FormattingToolbarController
          floatingUIOptions={{
            useTransitionStylesProps: {
              duration: { open: 0, close: closeDuration },
            },
            useTransitionStatusProps: {
              duration: { open: 0, close: closeDuration },
            },
          }}
        />
      ),
    });
    const toolbar = await showFormattingToolbar(editor);
    function buttonNames(element: HTMLElement) {
      return Array.from(element.querySelectorAll("button"), (button) => ({
        label: button.getAttribute("aria-label"),
        text: button.textContent,
      }));
    }
    const openButtons = buttonNames(toolbar);
    expect(openButtons.length).toBeGreaterThan(0);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      flushSync(() => {
        editor.setTextCursorPosition("paragraph-0", "start");
      });
      const closing = document.querySelector<HTMLElement>(
        ".bn-formatting-toolbar",
      );
      expect(closing).not.toBe(toolbar);
      expect(closing).not.toBeNull();
      expect(buttonNames(closing!)).toEqual(openButtons);

      flushSync(() => {
        vi.advanceTimersByTime(closeDuration);
      });
      expect(document.querySelector(".bn-formatting-toolbar")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
