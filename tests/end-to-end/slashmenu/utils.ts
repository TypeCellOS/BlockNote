import { Page } from "@playwright/test";

export const EDITOR_SELECTOR = `[data-test="editor"]`;
export const SLASH_MENU_SELECTOR = `[data-tippy-root]`;
export const H_ONE_BLOCK_SELECTOR = `[data-headingtype="1"] > [data-headingtype="1"]`;
export const H_TWO_BLOCK_SELECTOR = `[data-headingtype="2"] > [data-headingtype="2"]`;
export const H_THREE_BLOCK_SELECTOR = `[data-headingtype="3"] > [data-headingtype="3"]`;
export const BLOCK_GROUP_SELECTOR = `[class*="blockGroup"]`;
export const BLOCK_SELECTOR = `[data-id][class*="blockOuter"] > [data-id][class*="block_"]`;

export async function focusOnEditor(page: Page) {
  await page.waitForSelector(EDITOR_SELECTOR);
  await page.click(EDITOR_SELECTOR);
}

export async function openSlashMenu(page: Page) {
  await page.keyboard.type("/");
  await page.waitForSelector(SLASH_MENU_SELECTOR);
}

export async function executeSlashCommand(page: Page, command: string) {
  await openSlashMenu(page);
  await page.keyboard.type(command);
  await page.keyboard.press("Enter");
}

export async function waitForSelectorInEditor(page: Page, selector: string) {
  const editor = page.locator(EDITOR_SELECTOR);
  await editor.locator(selector).waitFor({
    state: "attached",
    timeout: 1000,
  });
}

export async function getDoc(page: Page) {
  const window = await page.evaluateHandle("window");
  const doc = await window.evaluate((win) =>
    (win as any).ProseMirror.getJSON()
  );
  return doc;
}

export function removeAttFromDoc(doc: unknown, att: string) {
  if (typeof doc !== "object") return;
  if (Object.keys(doc).includes(att)) {
    delete doc[att];
  }
  Object.keys(doc).forEach((key) => removeAttFromDoc(doc[key], att));
  return doc;
}
