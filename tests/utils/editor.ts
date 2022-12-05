import { Page, expect } from "@playwright/test";
import { EDITOR_SELECTOR } from "./const";

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

export async function getDoc(page: Page) {
  const window = await page.evaluateHandle("window");
  const doc = await window.evaluate((win) =>
    (win as any).ProseMirror.getJSON()
  );
  return doc;
}

export function removeAttFromDoc(doc: unknown, att: string) {
  if (typeof doc !== "object" || doc === null) return;
  if (Object.keys(doc).includes(att)) {
    delete doc[att];
  }
  Object.keys(doc).forEach((key) => removeAttFromDoc(doc[key], att));
  return doc;
}

export async function compareDocToSnapshot(page: Page, name: string) {
  // Remove id from docs
  const doc = JSON.stringify(
    removeAttFromDoc(await getDoc(page), "id"),
    null,
    2
  );
  expect(doc).toMatchSnapshot(`${name}.json`);
}

export function getMockIDMap(doc: unknown, mockIDs = {}) {
  if (typeof doc !== "object") return;
  if (Object.keys(doc).includes("id")) {
    mockIDs[doc["id"]] = Object.entries(mockIDs).length;
  }
  Object.keys(doc).forEach((key) => getMockIDMap(doc[key], mockIDs));
  return mockIDs;
}

function mockIDs(doc: unknown, mockIDMap: Record<string, number>) {
  if (typeof doc !== "object" || doc === null) return;
  if (Object.keys(doc).includes("id")) {
    if (!(doc["id"] in mockIDMap)) {
      mockIDMap[doc["id"]] = Object.entries(mockIDMap).length;
    }

    doc["id"] = mockIDMap[doc["id"]];
  }
  Object.keys(doc).forEach((key) => mockIDs(doc[key], mockIDMap));
  return doc;
}

export async function compareDocWithIDsToSnapshot(
  page: Page,
  mockIDMap: Record<string, number>,
  name: string
) {
  // Replaces actual IDs with mock IDs.
  const doc = JSON.stringify(mockIDs(await getDoc(page), mockIDMap), null, 2);
  expect(doc).toMatchSnapshot(`${name}.json`);
}
