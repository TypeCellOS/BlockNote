import App from "@examples/01-basic/testing/src/App";
import { afterEach, beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import {
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
  LINK_BUTTON_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import {
  focusOnEditor,
  expectElement,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { moveMouseOverElement, mouseSequence } from "../../utils/mouse.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

// Vitest browser mode has no per-test `colorScheme` knob (the playwright
// provider only takes it on the instance level via contextOptions). The editor
// detects scheme by querying `window.matchMedia('(prefers-color-scheme: dark)')`
// at mount (see packages/react/src/hooks/usePrefersColorScheme.ts), so we stub
// matchMedia before rendering. Restored in afterEach so other files aren't
// affected.
let originalMatchMedia: typeof window.matchMedia;

beforeEach(async () => {
  originalMatchMedia = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-color-scheme: dark"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("Check Dark Theme is Automatically Applied", () => {
  test("Should show dark editor", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");

    await expectElement(document.body).toMatchScreenshot("dark-editor");
  });
  test("Should show dark formatting toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "dark-formatting-toolbar",
    );
  });
  test("Should show dark link toolbar", async () => {
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));

    await sleep(500);
    await userEvent.keyboard("link");
    await userEvent.keyboard("{Enter}");
    await sleep(500);
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("dark-link-toolbar");
  });
  test("Should show dark slash menu", async () => {
    await focusOnEditor();
    await userEvent.keyboard("/");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("dark-slash-menu");
  });
  test("Should show dark emoji picker", async () => {
    await focusOnEditor();
    await userEvent.keyboard(":");
    await userEvent.keyboard("sm");

    await waitForSelector(".bn-frimousse-picker .bn-frimousse-emoji");
    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("dark-emoji-picker");
  });
  test("Should show dark side menu", async () => {
    await focusOnEditor();
    await waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("dark-side-menu");
  });
  test("Should show drag handle menu", async () => {
    await focusOnEditor();
    await waitForSelector(PARAGRAPH_SELECTOR);
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await sleep(500);
    await waitForSelector(DRAG_HANDLE_SELECTOR);
    await moveMouseOverElement(DRAG_HANDLE_SELECTOR);
    await mouseSequence([{ type: "down" }, { type: "up" }]);

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot(
      "dark-drag-handle-menu",
    );
  });
  test("Should show dark image toolbar", async () => {
    await focusOnEditor();
    await executeSlashCommand("image");

    await sleep(500);
    await expectElement(document.body).toMatchScreenshot("dark-image-toolbar");
  });
});
