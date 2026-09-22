import App from "@examples/01-basic/testing/src/App";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import {
  getRect,
  mouseSequence,
  moveMouseOverElement,
} from "../../utils/mouse.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";
const LINK_POPOVER_SELECTOR = ".bn-form-popover";
const LINK_TEXT = "Link";
// Character steps, not Shift+Home: Playwright's WebKit lays a typed paragraph
// out narrower than its text and breaks it mid-word, and on Linux Shift+Home
// selects only to the start of that visual line (on macOS it selects to the
// document start, which hides the break).
const SELECT_LINK_TEXT = `{Shift>}${"{ArrowLeft}".repeat(LINK_TEXT.length)}{/Shift}`;

// Runs in the "android" browser instance (Android UA + touch emulation at
// context level — see vite.config.browser.ts), so `isTouchDevice()` is
// genuinely true. The on-screen keyboard is emulated by resizing the
// viewport: `useVirtualKeyboard` treats a >150px height drop as the keyboard
// opening — which is exactly how a real keyboard manifests with
// `interactive-widget=resizes-content`. The extra ±60px step mimics Gboard
// showing its suggestion strip when focus moves into an input: the resize
// that used to make Mantine's `hideDetached` hide the link popover, blurring
// its focused input and collapsing the keyboard, toolbar, and popover (the
// Android Chrome bug behind PR #2982).
const VIEWPORT_WIDTH = 393;
const KEYBOARD_CLOSED = 727;
const KEYBOARD_OPEN = 427;
const KEYBOARD_OPEN_WITH_SUGGESTION_STRIP = 367;

// Lets a viewport resize propagate: the resize event, the floating-ui
// autoUpdate pass it triggers, and React's commit each take a frame.
async function settleFrames(count = 3) {
  for (let i = 0; i < count; i++) {
    await new Promise(requestAnimationFrame);
  }
}

function activeUrlInput() {
  const active = document.activeElement;
  return active instanceof HTMLInputElement && active.name === "url"
    ? active
    : undefined;
}

beforeEach(async () => {
  await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(async () => {
  await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
});

describe("Mobile formatting toolbar", () => {
  // Without the publisher count in `useVirtualKeyboard`, the `--bn-vv-*`
  // properties stay on `<html>` after the last editor unmounts, pinning a
  // `bn-scroll-container` to the keyboard-open height on the next page
  // (client-side navigation).
  test("unmounting the last editor removes the viewport properties", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    const html = document.documentElement;
    expect(html.style.getPropertyValue("--bn-vv-height")).not.toBe("");
    await cleanup();
    await settleFrames();
    expect(html.style.getPropertyValue("--bn-vv-height")).toBe("");
    expect(html.style.getPropertyValue("--bn-vv-scale")).toBe("");
  });

  // The extension's `show` state used to survive a blur: tapping the page
  // away from the editor closed the keyboard, the mobile controller unmounted,
  // and the desktop controller mounted with the stale `true` and showed the
  // desktop toolbar over a blurred editor.
  test("tapping away from the editor with the keyboard open leaves no formatting toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    // A tap on the page body blurs the editor, then the keyboard closes.
    (document.activeElement as HTMLElement).blur();
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
    await settleFrames();

    expect(document.querySelector(MOBILE_TOOLBAR_SELECTOR)).toBeNull();
    expect(document.querySelector(".bn-formatting-toolbar")).toBeNull();
  });

  test("shows while the virtual keyboard is open and hides when it closes", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
    await vi.waitFor(() => {
      if (document.querySelector(MOBILE_TOOLBAR_SELECTOR)) {
        throw new Error(
          "mobile toolbar still visible after the keyboard closed",
        );
      }
    });
  });

  // Red before the side menu's guard for pointer events over the editor's own
  // UI (SideMenu.ts). iOS Safari delivers a tap as a hover first, one mouse
  // move straight to the tap point, and drops the click when that hover
  // changes the page: with the toolbar far below the blocks, the move hid a
  // shown side menu and every toolbar button needed two taps.
  test("a pointer jumping onto the toolbar leaves a shown side menu alone", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Side menu");
    await moveMouseOverElement(await waitForSelector(".bn-block-content"));
    await waitForSelector(".bn-side-menu");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    const toolbar = await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    const button = getRect(toolbar.querySelector("button")!);
    await mouseSequence([
      {
        type: "move",
        x: button.x + button.width / 2,
        y: button.y + button.height / 2,
        steps: 1,
      },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(document.querySelector(".bn-side-menu")).not.toBeNull();
  });

  // The toolbar is portaled to the body, outside the pinned scroll container,
  // so nothing consumes a vertical drag on it and the gesture reaches the
  // document: with the keyboard open on iOS that pans the visual viewport or
  // starts Safari's pull-to-refresh, and the toolbar re-pins under the
  // finger. `touch-action: pan-x` on the strip stops that (on the strip, not
  // the wrapper: see `.bn-mobile-formatting-toolbar .bn-toolbar` in
  // styles.css). The pan is device behaviour; this pins the rule.
  test("the toolbar strip allows only horizontal touch panning", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    const toolbar = await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    expect(
      getComputedStyle(toolbar.querySelector(".bn-toolbar")!).touchAction,
    ).toBe("pan-x");
  });

  test("link popover holds focus through keyboard resizes and creates the link", async () => {
    await focusOnEditor();
    await userEvent.keyboard(LINK_TEXT);
    await userEvent.keyboard(SELECT_LINK_TEXT);

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );

    // The URL input autofocuses when the popover opens.
    await vi.waitFor(() => {
      if (!activeUrlInput()) {
        throw new Error("URL input did not receive focus on popover open");
      }
    });

    // iOS Safari auto-zooms the page when an input with a computed font-size
    // under 16px takes focus, and that zoom perturbs the visual viewport the
    // toolbar positions itself from. Emulation can't reproduce the zoom
    // itself (it's device behaviour, not engine behaviour — the real-device
    // suite asserts visualViewport.scale directly), so this guards the CSS
    // contract that prevents it.
    {
      const fontSize = parseFloat(getComputedStyle(activeUrlInput()!).fontSize);
      if (fontSize < 16) {
        throw new Error(
          `URL input font-size is ${fontSize}px; iOS Safari auto-zooms below ` +
            `16px (see the pointer:coarse rule in blocknoteStyles.css)`,
        );
      }
    }

    // Focusing an input makes the keyboard show its suggestion strip, then
    // settle back. The focused input must survive both resizes.
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN_WITH_SUGGESTION_STRIP);
    await settleFrames();
    if (!activeUrlInput()) {
      throw new Error("URL input lost focus when the suggestion strip resized");
    }

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await settleFrames();
    if (!activeUrlInput()) {
      throw new Error(
        "URL input lost focus when the suggestion strip resize settled",
      );
    }

    await userEvent.keyboard("example.com");
    await userEvent.keyboard("{Enter}");

    await waitForSelector(`${EDITOR_SELECTOR} a[href="https://example.com"]`);

    // Submitting closes the popover but leaves the toolbar up: on mobile the
    // toolbar stays mounted (unlike desktop, which unmounts it and the popover
    // with it), so the popover must close itself — the lingering popover
    // otherwise covers the toolbar and swallows taps on its buttons.
    await vi.waitFor(() => {
      if (document.querySelector(LINK_POPOVER_SELECTOR)) {
        throw new Error("link popover still open after submitting");
      }
      if (!document.querySelector(MOBILE_TOOLBAR_SELECTOR)) {
        throw new Error("mobile toolbar disappeared after submitting a link");
      }
    });

    // Reopening the popover with the whole link selected must pre-fill its
    // URL: `getSelectedLinkUrl` reads the mark just inside the selection
    // start, since a lookup exactly at the link's left boundary misses it.
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard(SELECT_LINK_TEXT);
    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    await vi.waitFor(() => {
      const input = activeUrlInput();
      if (input?.value !== "https://example.com") {
        throw new Error(
          `URL input not pre-filled for a fully selected link (value: ${JSON.stringify(input?.value)})`,
        );
      }
    });
  });

  // Closing the popover from its trigger must hand focus back to the editor:
  // on a real device, focus resting on the toolbar button closes the
  // on-screen keyboard (a button can't take text input) and the whole
  // editing session collapses with it.
  test("toggling the link popover closed returns focus to the editor", async () => {
    await focusOnEditor();
    await userEvent.keyboard(LINK_TEXT);
    await userEvent.keyboard(SELECT_LINK_TEXT);

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    const linkButton = await waitForSelector(
      `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
    );

    await userEvent.click(linkButton);
    await vi.waitFor(() => {
      if (!(document.activeElement instanceof HTMLInputElement)) {
        throw new Error("URL input did not receive focus on popover open");
      }
    });

    await userEvent.click(linkButton);
    await vi.waitFor(() => {
      if (document.querySelector('input[name="url"]')) {
        throw new Error("popover did not close on trigger toggle");
      }
      if (!document.activeElement?.closest(EDITOR_SELECTOR)) {
        throw new Error(
          `focus did not return to the editor (active: ${String(
            document.activeElement?.className,
          ).slice(0, 40)})`,
        );
      }
    });
  });
});
