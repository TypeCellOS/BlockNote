import App from "@examples/01-basic/testing/src/App";
import { afterEach, beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import {
  DRAG_HANDLE_SELECTOR,
  DRAG_HANDLE_MENU_SELECTOR,
  EDITOR_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import {
  focusOnEditor,
  expectElement,
  waitForSelector,
} from "../../utils/editor.js";
import { mouseSequence, moveMouseOverElement } from "../../utils/mouse.js";
import { executeSlashCommand, openSlashMenu } from "../../utils/slashmenu.js";
import { waitForEmojiPickerLayout } from "../../utils/emojipicker.js";

// Vitest browser mode has no per-test `colorScheme` knob (the playwright
// provider only takes it on the instance level via contextOptions). The editor
// detects scheme by querying `window.matchMedia('(prefers-color-scheme: dark)')`
// at mount (see packages/react/src/hooks/usePrefersColorScheme.ts), so we stub
// matchMedia before rendering. Restored in afterEach so other files aren't
// affected.
let originalMatchMedia: typeof window.matchMedia;

beforeEach(() => {
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
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function waitForDarkEditor() {
  return waitForSelector(
    `.bn-container[data-color-scheme="dark"] ${EDITOR_SELECTOR}`,
  );
}

async function renderApp() {
  await render(<App />);
  await waitForDarkEditor();
  await document.fonts.ready;
}

// Match the testing example's data-URL upload, which enables the Upload tab.
function uploadFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

describe("Check Dark Theme is Automatically Applied", () => {
  test("Should show dark editor", async () => {
    await renderApp();
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");

    await expectElement(document.body).toMatchScreenshot("dark-editor");
  });
  test("Should show dark formatting toolbar", async () => {
    await renderApp();
    await focusOnEditor();
    await userEvent.keyboard("Paragraph{Shift>}{Home}{/Shift}");

    await expectElement(
      await waitForSelector(".bn-formatting-toolbar"),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot(
      "dark-formatting-toolbar",
    );
  });
  it("Should show dark link toolbar", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      initialContent: [
        {
          type: "paragraph",
          content: [{ type: "link", href: "link", content: "Paragraph" }],
        },
      ],
      uploadFile,
    });
    await waitForDarkEditor();
    editor.focus();
    await window.__blockNoteWaitForEditorFocus();
    await userEvent.keyboard("{ArrowRight}");

    // A missing link toolbar stays within the 2% screenshot tolerance, so
    // assert it exists before comparing (see the ariakit test).
    await expectElement(
      await waitForSelector(".bn-link-toolbar"),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot("dark-link-toolbar");
  });
  test("Should show dark slash menu", async () => {
    await renderApp();
    await focusOnEditor();
    await openSlashMenu();

    await expectElement(document.body).toMatchScreenshot("dark-slash-menu");
  });
  test("Should show dark emoji picker", async () => {
    await renderApp();
    await focusOnEditor();
    await userEvent.keyboard(":sm");

    await waitForEmojiPickerLayout();
    await expectElement(document.body).toMatchScreenshot("dark-emoji-picker");
  });
  test("Should show dark side menu", async () => {
    await renderApp();
    await focusOnEditor();
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    await expectElement(
      await waitForSelector(DRAG_HANDLE_SELECTOR),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot("dark-side-menu");
  });
  test("Should show drag handle menu", async () => {
    await renderApp();
    await focusOnEditor();
    await moveMouseOverElement(PARAGRAPH_SELECTOR);

    const handle = await waitForSelector(DRAG_HANDLE_SELECTOR);
    await userEvent.click(handle.closest("button")!);

    await expectElement(
      await waitForSelector(DRAG_HANDLE_MENU_SELECTOR),
    ).toBeVisible();
    await expectElement(document.body).toMatchScreenshot(
      "dark-drag-handle-menu",
    );
  });
  test("Should show dark image toolbar", async () => {
    await renderApp();
    await focusOnEditor();
    await executeSlashCommand("image");

    await expectElement(await waitForSelector(".bn-panel")).toBeVisible();
    // This captures the automatic dark theme and opened image toolbar, not the
    // placeholder's hover styling. Park outside both before taking the baseline.
    await mouseSequence([
      { type: "move", x: window.innerWidth - 1, y: window.innerHeight - 1 },
    ]);
    await expectElement(document.body).toMatchScreenshot("dark-image-toolbar");
  });
});
