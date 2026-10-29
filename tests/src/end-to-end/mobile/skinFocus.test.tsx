import AriakitApp from "@examples/01-basic/08-ariakit/src/App";
import "@examples/01-basic/09-shadcn/tailwind.css";
import ShadcnApp from "@examples/01-basic/09-shadcn/src/App";
import MantineApp from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";
import { clickAt, getRect } from "../../utils/mouse.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

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

const SKINS = [
  { name: "mantine", App: MantineApp },
  { name: "ariakit", App: AriakitApp },
  { name: "shadcn", App: ShadcnApp },
] as const;

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

async function openSurface(surface: (typeof SURFACES)[number]) {
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

function activeIsInEditor() {
  return document.activeElement?.closest(EDITOR_SELECTOR) !== null;
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
function trackFocusLeavingEditor() {
  const editorElement = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;
  const left: string[] = [];
  function onFocusOut(event: FocusEvent) {
    const to = event.relatedTarget;
    if (!(to instanceof Node) || !editorElement.contains(to)) {
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
  return {
    left,
    stop() {
      editorElement.removeEventListener("focusout", onFocusOut);
    },
  };
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

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

async function openMobileToolbar() {
  await focusOnEditor();
  await userEvent.keyboard("Some text");
  await userEvent.keyboard("{Shift>}{Home}{/Shift}");
  // "Keyboard opens": the mobile toolbar appears.
  await page.viewport(393, 427);
  await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
}

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
});

for (const skin of SKINS) {
  describe(`Mobile toolbar focus with the ${skin.name} skin`, () => {
    beforeEach(async () => {
      await render(<skin.App />);
      await waitForSelector(EDITOR_SELECTOR);
    });

    test("the link button hands focus to the URL input", async () => {
      await openMobileToolbar();
      await userEvent.click(
        await waitForSelector(
          `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
        ),
      );
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
    for (const [kind, selector] of [
      ["a popover trigger", LINK_BUTTON_SELECTOR],
      ["a toggle button", "[data-test=bold]"],
    ] as const) {
      test(`tapping ${kind} never moves focus onto it`, async () => {
        await openMobileToolbar();
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
          await userEvent.click(
            await waitForSelector(`${MOBILE_TOOLBAR_SELECTOR} ${selector}`),
          );
          await settle();
        } finally {
          document.removeEventListener("focusin", onFocusIn, true);
        }
        expect(focusedButtons).toEqual([]);
      });
    }

    for (const surface of SURFACES) {
      // Separate from the focus assertion below so a surface that fails to
      // open at all cannot hide behind a `test.fails`.
      test(`opening the ${surface.control} shows it`, async () => {
        await openMobileToolbar();
        await openSurface(surface);
        findItem(await waitForOpenPopup(), surface.item);
      });

      test(`opening the ${surface.control} keeps focus in the editor`, async () => {
        await openMobileToolbar();
        const focus = trackFocusLeavingEditor();
        await openSurface(surface);
        await waitForOpenPopup();
        await settle();
        focus.stop();
        expect(focus.left).toEqual([]);
        expect(activeIsInEditor()).toBe(true);
        expect(document.querySelector(MOBILE_TOOLBAR_SELECTOR)).not.toBeNull();
      });

      // Picking an item closes the surface; neither the tap on the item nor
      // the close may move focus (Ariakit's `focusOnHover` and
      // `autoFocusOnHide`, Mantine's `returnFocus`).
      test(`picking from the ${surface.control} leaves focus in the editor`, async () => {
        await openMobileToolbar();
        await openSurface(surface);
        const item = findItem(await waitForOpenPopup(), surface.item);
        const focus = trackFocusLeavingEditor();
        await tapWhenSettled(item);
        await settle();
        focus.stop();
        expect(focus.left).toEqual([]);
        expect(activeIsInEditor()).toBe(true);
        expect(document.querySelector(MOBILE_TOOLBAR_SELECTOR)).not.toBeNull();
      });
    }
  });
}
