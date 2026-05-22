import { expect, vi } from "vite-plus/test";
import { userEvent } from "./context.js";
import { EDITOR_SELECTOR } from "./const.js";

/** Fixed pause for animations/debounces the editor relies on. */
export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Resolves once `selector` is attached to the DOM, returning the element. */
export function waitForSelector(
  selector: string,
  options?: { timeout?: number },
): Promise<HTMLElement> {
  return vi.waitFor(
    () => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Selector not found: ${selector}`);
      }
      return element;
    },
    { timeout: options?.timeout ?? 5000 },
  );
}

/** Resolves once `selector` is no longer in the DOM. */
export function waitForSelectorDetached(
  selector: string,
  options?: { timeout?: number },
): Promise<void> {
  return vi.waitFor(
    () => {
      if (document.querySelector(selector)) {
        throw new Error(`Selector still attached: ${selector}`);
      }
    },
    { timeout: options?.timeout ?? 5000 },
  );
}

export async function focusOnEditor() {
  const editor = await waitForSelector(EDITOR_SELECTOR);
  await userEvent.click(editor);
}

export async function waitForSelectorInEditor(selector: string) {
  await waitForSelector(`${EDITOR_SELECTOR} ${selector}`, { timeout: 1000 });
}

export async function waitForTextInEditor(text: string) {
  await vi.waitFor(
    () => {
      const editor = document.querySelector(EDITOR_SELECTOR);
      if (!editor || !editor.textContent?.includes(text)) {
        throw new Error(`Text not found in editor: ${text}`);
      }
    },
    { timeout: 1000 },
  );
}

/**
 * Returns the editor's ProseMirror document as JSON. The test runs inside the
 * browser, so we read the global the editor exposes directly (no
 * `page.evaluate` round-trip needed).
 */
export function getDoc() {
  return (window as any).ProseMirror.getJSON();
}

export function removeAttFromDoc(doc: any, att: string) {
  if (typeof doc !== "object" || doc === null) {
    return;
  }
  if (Object.keys(doc).includes(att)) {
    delete doc[att];
  }
  Object.keys(doc).forEach((key) => removeAttFromDoc(doc[key], att));
  return doc;
}

/**
 * Asserts the editor document matches a stored JSON snapshot. The path is
 * resolved relative to the running test file, so snapshots live in a
 * `__snapshots__/` dir next to each test. Documents are browser-independent,
 * so a single snapshot is shared across the chromium/firefox/webkit instances.
 */
export async function compareDocToSnapshot(name: string) {
  const doc = JSON.stringify(getDoc(), null, 2);
  await expect(doc).toMatchFileSnapshot(`./__snapshots__/${name}.json`);
}

// Vite Plus ships the browser matchers' `expect.element` augmentation against
// the bare `vitest` module, but its own `expect` is typed from an internal
// module, so the augmentation doesn't attach. Type the accessor locally.
type ElementExpect = (
  element: Element | null,
  options?: { timeout?: number },
) => { toMatchScreenshot(name?: string): Promise<void> };

const expectElement = (expect as unknown as { element: ElementExpect }).element;

/**
 * Visual regression snapshot of the whole page (captures the editor plus any
 * portalled menus/toolbars). Vitest names baselines per browser + platform
 * automatically.
 */
export async function matchPageScreenshot(name: string) {
  await expectElement(document.body).toMatchScreenshot(name);
}

/**
 * Programmatically move cursor to end of the current block content.
 * This avoids relying on keyboard navigation (ArrowUp/End) which can
 * position the cursor incorrectly in WebKit when crossing blocks with
 * different indentation levels.
 */
export async function moveCursorToBlockEnd(page: Page) {
  await page.evaluate(() => {
    const tiptap = (window as any).ProseMirror;
    const bnEditor = tiptap.schema.cached.blockNoteEditor;
    const block = bnEditor.getTextCursorPosition().block;
    bnEditor.setTextCursorPosition(block, "end");
  });
}

/**
 * Programmatically move cursor to start of the current block content.
 * This avoids relying on keyboard navigation which can be unreliable
 * in WebKit.
 */
export async function moveCursorToBlockStart(page: Page) {
  await page.evaluate(() => {
    const tiptap = (window as any).ProseMirror;
    const bnEditor = tiptap.schema.cached.blockNoteEditor;
    const block = bnEditor.getTextCursorPosition().block;
    bnEditor.setTextCursorPosition(block, "start");
  });
}
