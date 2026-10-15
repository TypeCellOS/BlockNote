import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import {
  openEditor,
  checkAxe,
  pressKey,
  readSelection,
} from "@root/tests/a11y/helpers.js";
import {
  blocksDocument,
  inlineContentDocument,
  tablesDocument,
} from "./axe-documents.js";

for (const theme of ["light", "dark"] as const) {
  test(`default schema blocks: axe (${theme})`, async ({ annotate }) => {
    for (const block of blocksDocument) {
      if (
        block.id?.startsWith("axe-heading-") ||
        block.id?.startsWith("axe-toggleListItem-")
      ) {
        localStorage.setItem(
          `toggle-${block.id}`,
          String(block.id.includes("-true-")),
        );
      }
    }
    await openEditor(blocksDocument, { theme });
    await pressKey("Tab");
    await expect.poll(() => readSelection().blockId).toBe("axe-placeholder");
    await expect.element(page.getByRole("textbox")).toHaveFocus();
    await checkAxe(annotate);
  });

  test(`default inline content and colors: axe (${theme})`, async ({
    annotate,
  }) => {
    await openEditor(inlineContentDocument, { theme });
    await checkAxe(annotate);
  });

  test(`tables: axe (${theme})`, async ({ annotate }) => {
    await openEditor(tablesDocument, { theme });
    const header = page
      .getByText("Quarter totals", { exact: true })
      .element()
      .closest("th");
    expect(header?.getAttribute("colspan")).toBe("2");
    const mergedCell = page
      .getByText("Combined total", { exact: true })
      .element()
      .closest("td");
    expect(mergedCell?.getAttribute("colspan")).toBe("2");
    expect(mergedCell?.getAttribute("rowspan")).toBe("2");
    await checkAxe(annotate);
  });
}
