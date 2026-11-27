import "@blocknote/ariakit/style.css";
import { isDOMNode } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import {
  beforeEach,
  describe,
  expect,
  type TestContext,
  vi,
} from "vite-plus/test";

import shadcnStyles from "../../../../examples/01-basic/09-shadcn/tailwind.css?inline";
import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { useBrowserSuiteStyles } from "../../commands/browser/useBrowserSuiteStyles.js";
import { selectText } from "../../commands/node/selectText.js";
import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";
import { clickAt, getRect } from "../../utils/mouse.js";

useBrowserSuiteStyles(shadcnStyles);

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";
const PHONE_WIDTH = 393;
const KEYBOARD_CLOSED_HEIGHT = 727;
const KEYBOARD_OPEN_HEIGHT = 427;
const SELECTED_TEXT = "Some text";
const SELECTED_BLOCK = "selected-block";

// What the mobile toolbar promises, per skin: a tap on a toolbar button must
// not move focus off the editor (that closes the on-screen keyboard); a
// surface opening from it must not either (`preventFocusOnOpen`), except to
// an input that asks for it (the link form); tapping an item and the surface
// closing must not move focus either. "Move" means still elsewhere once the
// task ends: a blur that lasts flickers the keyboard, a same-task hand-back
// (the shadcn adapters) does not, see `trackFocusLeavingEditor`.
//
// Red for ariakit and shadcn without the adapter changes: their buttons took
// the tap's focus, Ariakit focused the menu / listbox on open and the button
// on close and never focused the URL input (its popover content stays mounted
// while closed, so the mount-time autofocus fired once, invisibly), and Base
// UI focuses its menu and select popups on open with no way to turn that off.

const SKINS = ["mantine", "ariakit", "shadcn"] as const;

// The two toolbar surfaces under test, found by what a user sees: the block
// type select shows the current block type ("Paragraph" here), the colors
// button carries a test id.
const SURFACES = [
  {
    control: "block type select",
    findTrigger: () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          `${MOBILE_TOOLBAR_SELECTOR} button, ${MOBILE_TOOLBAR_SELECTOR} [role=combobox]`,
        ),
      ).find((el) => /paragraph/i.test(el.textContent ?? "")),
    item: /heading 2/i,
  },
  {
    control: "colors menu",
    findTrigger: () =>
      document.querySelector<HTMLElement>(
        `${MOBILE_TOOLBAR_SELECTOR} [data-test=colors]`,
      ) ?? undefined,
    item: /red/i,
  },
] as const;

async function clickSurfaceTrigger(surface: (typeof SURFACES)[number]) {
  const trigger = await vi.waitFor(() => {
    const el = surface.findTrigger();
    if (!el) {
      throw new Error(`no trigger for the ${surface.control}`);
    }
    return el;
  });
  await userEvent.click(trigger);
}

function describeElement(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return target === null ? "null" : "(non-element)";
  }
  const role = target.getAttribute("role");
  return `${target.tagName.toLowerCase()}${role ? `[role=${role}]` : ""}.${Array.from(target.classList).slice(0, 2).join(".")}`;
}

// The popup that just opened, once it is laid out. Either role: the block
// type select is a listbox in ariakit and shadcn but a Mantine Menu in
// mantine. By visibility rather than presence: Ariakit keeps its listbox
// mounted (and hidden) while closed, so a bare selector matches that before,
// or instead of, the surface that just opened.
async function waitForOpenPopup() {
  let popup: HTMLElement | undefined;
  await vi.waitFor(() => {
    popup = Array.from(
      document.querySelectorAll<HTMLElement>(
        `[role=menu], [role=listbox]:not(${EDITOR_SELECTOR})`,
      ),
    ).find((el) => el.getBoundingClientRect().height > 0);
    if (!popup) {
      throw new Error("no visible menu or listbox");
    }
  });
  return popup!;
}

// Records every time focus leaves the editor, with where it went. The
// assertions want this to stay empty: a final `activeIsInEditor()` alone would
// let a blur + re-focus (keyboard flicker) pass.
function trackFocusLeavingEditor(
  editorElement: HTMLElement,
  onTestFinished: TestContext["onTestFinished"],
) {
  const left: string[] = [];
  function onFocusOut(event: FocusEvent) {
    const to = event.relatedTarget;
    if (!isDOMNode(to) || !editorElement.contains(to)) {
      // A departure counts only if focus is still elsewhere once the task
      // ends: Base UI focuses its popup on open and the shadcn adapters hand
      // focus back inside the same dispatch, which keeps the keyboard up
      // (Chrome decides the keyboard's fate after the task).
      const departedTo = describeElement(to);
      queueMicrotask(() => {
        if (!editorElement.contains(document.activeElement)) {
          left.push(departedTo);
        }
      });
    }
  }
  editorElement.addEventListener("focusout", onFocusOut);
  onTestFinished(() =>
    editorElement.removeEventListener("focusout", onFocusOut),
  );
  return left;
}

// Taps `element` once it is where the tap will land (popups position a frame
// after they appear). Coordinates rather than an element click: Playwright's
// click never passes its actionability checks for Ariakit's menu item under
// the mobile emulation.
async function tapWhenSettled(element: HTMLElement) {
  let x = 0;
  let y = 0;
  await vi.waitFor(() => {
    const rect = getRect(element);
    x = rect.x + rect.width / 2;
    y = rect.y + rect.height / 2;
    if (!element.contains(document.elementFromPoint(x, y))) {
      throw new Error("item is not at its final position yet");
    }
  });
  await clickAt(x, y);
}

function findItem(popup: HTMLElement, pattern: RegExp) {
  const item = Array.from(
    popup.querySelectorAll<HTMLElement>(
      "[role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=option]",
    ),
  ).find((el) => pattern.test(el.textContent ?? ""));
  if (!item) {
    throw new Error(`no item matching ${pattern} in the open popup`);
  }
  return item;
}

async function openMobileToolbar(
  setupEditor: SetupEditor,
  skin: (typeof SKINS)[number],
  controlSelector?: string,
) {
  const { editor, rootNode } = await setupEditor({
    skin,
    initialContent: [
      { id: SELECTED_BLOCK, type: "paragraph", content: SELECTED_TEXT },
    ],
  });
  const editorElement = rootNode.querySelector<HTMLElement>(EDITOR_SELECTOR);
  if (!editorElement) {
    throw new Error("Missing editor in the mounted skin");
  }
  // Shift+Home can leave only a caret at a visual line boundary on WebKit.
  // The tap is under test, not the gesture used to select its source text.
  selectText(editor, SELECTED_TEXT);
  editor.focus();
  // "Keyboard opens": the mobile toolbar appears.
  await page.viewport(PHONE_WIDTH, KEYBOARD_OPEN_HEIGHT);
  const target = await waitForSelector(
    controlSelector
      ? `${MOBILE_TOOLBAR_SELECTOR} ${controlSelector}`
      : MOBILE_TOOLBAR_SELECTOR,
  );
  const selection = editorElement.ownerDocument.getSelection();
  expect(editorElement).toBe(editorElement.ownerDocument.activeElement);
  expect(selection?.toString()).toBe(SELECTED_TEXT);
  expect(editorElement.contains(selection?.anchorNode ?? null)).toBe(true);
  expect(editorElement.contains(selection?.focusNode ?? null)).toBe(true);
  return { editor, editorElement, target };
}

beforeEach(async ({ onTestFinished }) => {
  ensureTouchEmulation();
  const { innerWidth, innerHeight } = window;
  onTestFinished(() => page.viewport(innerWidth, innerHeight));
  await page.viewport(PHONE_WIDTH, KEYBOARD_CLOSED_HEIGHT);
});

for (const skin of SKINS) {
  describe(`Mobile toolbar focus with the ${skin} skin`, () => {
    it("the link button hands focus to the URL input", async ({
      setupEditor,
    }) => {
      const { target } = await openMobileToolbar(
        setupEditor,
        skin,
        LINK_BUTTON_SELECTOR,
      );
      await userEvent.click(target);
      await vi.waitFor(() => {
        if (!(document.activeElement instanceof HTMLInputElement)) {
          throw new Error("URL input did not receive focus");
        }
      });
      expect(document.querySelector(MOBILE_TOOLBAR_SELECTOR)).not.toBeNull();
      // Below 16px iOS Safari zooms the page on focus and the toolbar loses
      // its place. Mantine has a coarse-pointer rule for it (pinned in
      // mobileToolbar.test.tsx); the ariakit and shadcn inputs are 16px
      // already, this pins that too.
      expect(
        parseFloat(getComputedStyle(document.activeElement!).fontSize),
      ).toBeGreaterThanOrEqual(16);
    });

    // The ariakit and shadcn ToolbarButton guard their mousedown on touch like
    // Mantine's, and spread the library's injected `onMouseDown` before their
    // own so the guard is not replaced. One case for a popover trigger (the
    // library injects handlers into it), one for a plain toggle button.
    for (const [kind, selector, activated] of [
      ["a popover trigger", LINK_BUTTON_SELECTOR, 'input[name="url"]:focus'],
      ["a toggle button", "[data-test=bold]", `${EDITOR_SELECTOR} strong`],
    ] as const) {
      it(`tapping ${kind} never moves focus onto it`, async ({
        setupEditor,
      }) => {
        const { target: trigger } = await openMobileToolbar(
          setupEditor,
          skin,
          selector,
        );
        const focusedButtons: string[] = [];
        function onFocusIn(event: Event) {
          const target = event.target as HTMLElement;
          if (target.closest(`${MOBILE_TOOLBAR_SELECTOR} button`)) {
            focusedButtons.push(
              target.getAttribute("data-test") ?? target.tagName,
            );
          }
        }
        document.addEventListener("focusin", onFocusIn, true);
        try {
          await userEvent.click(trigger);
          await waitForSelector(activated);
        } finally {
          document.removeEventListener("focusin", onFocusIn, true);
        }
        expect(focusedButtons).toEqual([]);
      });
    }

    for (const surface of SURFACES) {
      // Separate from the focus assertion below so a surface that fails to
      // open at all cannot hide behind a `test.fails`.
      it(`opening the ${surface.control} shows it`, async ({ setupEditor }) => {
        await openMobileToolbar(setupEditor, skin);
        await clickSurfaceTrigger(surface);
        findItem(await waitForOpenPopup(), surface.item);
      });

      it(`opening the ${surface.control} keeps focus in the editor`, async ({
        onTestFinished,
        setupEditor,
      }) => {
        const { editorElement } = await openMobileToolbar(setupEditor, skin);
        const focusDepartures = trackFocusLeavingEditor(
          editorElement,
          onTestFinished,
        );
        await clickSurfaceTrigger(surface);
        await waitForOpenPopup();
        // Include the frame after layout, when popovers can apply autofocus.
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        expect(focusDepartures).toEqual([]);
        expect(editorElement.contains(document.activeElement)).toBe(true);
        expect(document.querySelector(MOBILE_TOOLBAR_SELECTOR)).not.toBeNull();
      });

      // Neither picking an item nor closing the surface may move focus
      // (Ariakit's `focusOnHover` and `autoFocusOnHide`, Mantine's `returnFocus`).
      it(`picking from the ${surface.control} leaves focus in the editor`, async ({
        onTestFinished,
        setupEditor,
      }) => {
        const { editor, editorElement } = await openMobileToolbar(
          setupEditor,
          skin,
        );
        await clickSurfaceTrigger(surface);
        const popup = await waitForOpenPopup();
        const item = findItem(popup, surface.item);
        const focusDepartures = trackFocusLeavingEditor(
          editorElement,
          onTestFinished,
        );
        await tapWhenSettled(item);
        if (surface.control === "block type select") {
          await expect
            .poll(() => editor.getBlock(SELECTED_BLOCK))
            .toMatchObject({
              type: "heading",
              props: { level: 2 },
            });
        } else {
          await expect
            .poll(() => editor.getBlock(SELECTED_BLOCK)?.content)
            .toEqual([
              {
                type: "text",
                text: SELECTED_TEXT,
                styles: { textColor: "red" },
              },
            ]);
        }
        if (
          skin === "shadcn" &&
          item.getAttribute("role") === "menuitemcheckbox"
        ) {
          // Base UI checkbox items leave the menu open. Close with the trigger
          // while still tracking focus.
          await clickSurfaceTrigger(surface);
        }
        await vi.waitFor(() =>
          expect(
            popup.getBoundingClientRect().height === 0 ||
              getComputedStyle(popup).visibility === "hidden",
          ).toBe(true),
        );
        await new Promise(requestAnimationFrame);
        expect(focusDepartures).toEqual([]);
        expect(editorElement.contains(document.activeElement)).toBe(true);
        expect(document.querySelector(MOBILE_TOOLBAR_SELECTOR)).not.toBeNull();
      });
    }
  });
}
