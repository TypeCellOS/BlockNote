import { Page, expect } from "@playwright/test";
import { EDITOR_SELECTOR } from "./const.js";

export async function focusOnEditor(page: Page) {
  await page.waitForSelector(EDITOR_SELECTOR);
  await page.click(EDITOR_SELECTOR);
}

export async function waitForSelectorInEditor(page: Page, selector: string) {
  const editor = page.locator(EDITOR_SELECTOR);
  await editor.locator(selector).waitFor({
    state: "attached",
    timeout: 1000,
  });
}

export async function waitForTextInEditor(page: Page, text: string) {
  const editor = page.locator(EDITOR_SELECTOR);
  await editor.getByText(text).waitFor({
    state: "attached",
    timeout: 1000,
  });
}

export async function getDoc(page: Page) {
  const window = await page.evaluateHandle("window");
  const doc = await window.evaluate((win) =>
    (win as any).ProseMirror.getJSON(),
  );
  return doc;
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

export async function compareDocToSnapshot(page: Page, name: string) {
  // Remove id from docs
  const doc = JSON.stringify(await getDoc(page), null, 2);
  expect(doc).toMatchSnapshot(`${name}.json`);
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
