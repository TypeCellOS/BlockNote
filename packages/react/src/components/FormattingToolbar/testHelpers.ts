import { page } from "vite-plus/test/browser";
import { pressKey, selectToLineEndKey } from "@root/tests/a11y/helpers.js";

// Start from "Before editor" after openEditor(). Keep the navigation steps
// identical to focusToolbarItemWithAssertions in the keyboard suite.
export async function focusToolbarItem(toolbarItem: string) {
  await pressKey("Tab");
  await pressKey("ArrowDown");
  await pressKey(selectToLineEndKey);
  const toolbar = page.getByRole("toolbar");
  await pressKey("Tab");
  const target = toolbar.getByRole("button", {
    name: toolbarItem,
    exact: true,
  });
  while (document.activeElement !== target.element()) {
    await pressKey("Tab");
  }
  return { toolbar, button: target };
}
