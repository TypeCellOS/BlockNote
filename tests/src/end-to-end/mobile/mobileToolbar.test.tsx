import "@blocknote/core/fonts/inter.css";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { afterEach, beforeEach, describe, expect, vi } from "vite-plus/test";

import { selectText } from "../../commands/node/selectText.js";
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
});

afterEach(async () => {
  await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
});

describe("Mobile formatting toolbar", () => {
  // Without the publisher count in `useVirtualKeyboard`, the `--bn-vv-*`
  // properties stay on `<html>` after the last editor unmounts, pinning a
  // `bn-scroll-container` to the keyboard-open height on the next page
  // (client-side navigation).
  it("unmounting the last editor removes the viewport properties", async ({
    setupEditor,
  }) => {
    let mounted = true;
    const { rerender } = await setupEditor({
      outside: ({ children }) => (mounted ? children : null),
    });
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    const html = document.documentElement;
    expect(html.style.getPropertyValue("--bn-vv-height")).not.toBe("");
    mounted = false;
    rerender({});
    await settleFrames();
    expect(html.style.getPropertyValue("--bn-vv-height")).toBe("");
    expect(html.style.getPropertyValue("--bn-vv-scale")).toBe("");
  });

  // The extension's `show` state used to survive a blur: tapping the page
  // away from the editor closed the keyboard, the mobile controller unmounted,
  // and the desktop controller mounted with the stale `true` and showed the
  // desktop toolbar over a blurred editor.
  it("tapping away from the editor with the keyboard open leaves no formatting toolbar", async ({
    setupEditor,
  }) => {
    await setupEditor();
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

  // A real blur, then focus coming back without a gesture (a programmatic
  // `focus()`), so the keyboard stays closed. The selection used to survive
  // the blur, so the desktop toolbar showed over it, and without the keyboard
  // no tap could clear it.
  it("focus returning without the keyboard brings back neither the selection nor a toolbar", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    const editorElement = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;
    editorElement.blur();
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
    await settleFrames();

    // No gesture: the keyboard stays closed.
    editorElement.focus();
    await settleFrames();

    expect(editor.getSelection()).toBeUndefined();
    expect(document.querySelector(".bn-formatting-toolbar")).toBeNull();
  });

  // The tap on iOS Safari's address bar blurs only the window: the editor
  // keeps DOM focus, so without dropping it no focusout ever reached the
  // editor and the selection survived.
  it("a window blur that leaves the editor focused ends the selection", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    const editorElement = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;
    // WebKit's page blur: `blur` on the focused element, without focusout and
    // without moving `document.activeElement`, then on the window.
    editorElement.dispatchEvent(new FocusEvent("blur"));
    window.dispatchEvent(new FocusEvent("blur"));
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_CLOSED);
    await settleFrames();

    expect(document.activeElement).not.toBe(editorElement);
    expect(editor.getSelection()).toBeUndefined();
    expect(document.querySelector(".bn-formatting-toolbar")).toBeNull();
  });

  it("shows while the virtual keyboard is open and hides when it closes", async ({
    setupEditor,
  }) => {
    await setupEditor();
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

  // The toolbar is portaled to the body, outside the pinned scroll container,
  // so nothing consumes a vertical drag on it and the gesture reaches the
  // document: with the keyboard open on iOS that pans the visual viewport or
  // starts Safari's pull-to-refresh, and the toolbar re-pins under the
  // finger. `touch-action: pan-x` on the strip stops that (on the strip, not
  // the wrapper: see `.bn-mobile-formatting-toolbar .bn-toolbar` in
  // styles.css). The pan is device behaviour; this pins the rule.
  it("the toolbar strip allows only horizontal touch panning", async ({
    setupEditor,
  }) => {
    await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");
    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    const toolbar = await waitForSelector(MOBILE_TOOLBAR_SELECTOR);

    expect(
      getComputedStyle(toolbar.querySelector(".bn-toolbar")!).touchAction,
    ).toBe("pan-x");
  });

  it("link popover holds focus through keyboard resizes and creates the link", async ({
    setupEditor,
  }) => {
    const { editor, rootNode } = await setupEditor();
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
    // Reselecting is setup for reopening, not a keyboard navigation contract.
    // Preserve the close-to-editor focus handoff before arranging the selection.
    expect(document.activeElement).toBe(
      rootNode.querySelector(EDITOR_SELECTOR),
    );
    await window.__blockNoteWaitForEditorFocus();
    selectText(editor, LINK_TEXT);
    expect(editor.getSelectedText()).toBe(LINK_TEXT);
    await expect
      .poll(() => document.getSelection()?.toString())
      .toBe(LINK_TEXT);
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
  it("toggling the link popover closed returns focus to the editor", async ({
    setupEditor,
  }) => {
    const { editor, rootNode } = await setupEditor({
      initialContent: [{ type: "paragraph", content: LINK_TEXT }],
    });
    const editorElement = rootNode.querySelector(EDITOR_SELECTOR);
    if (!editorElement) {
      throw new Error("Missing mounted editor");
    }
    // The toggle needs selected text; keyboard selection isn't under test.
    selectText(editor, LINK_TEXT);
    editor.focus();

    await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    const selection = document.getSelection();
    expect(document.activeElement).toBe(editorElement);
    expect(selection?.toString()).toBe(LINK_TEXT);
    expect(editorElement.contains(selection?.anchorNode ?? null)).toBe(true);
    expect(editorElement.contains(selection?.focusNode ?? null)).toBe(true);
    const linkButton = await waitForSelector(
      `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
    );

    await userEvent.click(linkButton);
    await vi.waitFor(() => {
      if (!activeUrlInput()) {
        throw new Error("URL input did not receive focus on popover open");
      }
    });

    await userEvent.click(linkButton);
    await vi.waitFor(() => {
      if (document.querySelector('input[name="url"]')) {
        throw new Error("popover did not close on trigger toggle");
      }
      if (document.activeElement !== editorElement) {
        throw new Error(
          `focus did not return to the editor (active: ${String(
            document.activeElement?.className,
          ).slice(0, 40)})`,
        );
      }
    });
  });
});

// iOS Safari can deliver a tap as a single mouse move straight to the tap
// point first. Hiding a shown side menu during that move can lose the click.
it("a pointer jumping onto the toolbar leaves a shown side menu alone", async ({
  setupEditor,
}) => {
  const { editor } = await setupEditor();
  await focusOnEditor();
  await userEvent.keyboard("Side menu");
  await moveMouseOverElement(await waitForSelector(".bn-block-content"));
  await waitForSelector(".bn-side-menu");

  await page.viewport(VIEWPORT_WIDTH, KEYBOARD_OPEN);
  const button = await waitForSelector(`${MOBILE_TOOLBAR_SELECTOR} button`);
  function buttonCenter() {
    const rect = getRect(button);
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  await expect
    .poll(() => {
      const { x, y } = buttonCenter();
      return button.contains(document.elementFromPoint(x, y));
    })
    .toBe(true);

  const store = editor.getExtension(SideMenuExtension)!.store;
  const shownMenu = store.state;
  expect(shownMenu?.show).toBe(true);

  // The side menu decides synchronously in its capture listener. Observe
  // delivery to the actual button, then check the store rather than waiting
  // for a possible React unmount to show up in the DOM.
  let moveToButton: { menu: typeof store.state } | undefined;
  function recordMouseMove(event: MouseEvent) {
    if (
      !moveToButton &&
      event.isTrusted &&
      event.target instanceof Node &&
      button.contains(event.target)
    ) {
      moveToButton = { menu: store.state };
    }
  }
  document.addEventListener("mousemove", recordMouseMove, true);
  try {
    await mouseSequence([{ type: "move", ...buttonCenter(), steps: 1 }]);
    await expect.poll(() => moveToButton).toBeDefined();
    expect(moveToButton?.menu).toMatchObject({
      show: true,
      block: { id: shownMenu?.block.id },
    });
    expect(document.querySelector(".bn-side-menu")).not.toBeNull();
  } finally {
    document.removeEventListener("mousemove", recordMouseMove, true);
  }
});
