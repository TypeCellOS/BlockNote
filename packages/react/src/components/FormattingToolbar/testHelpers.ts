import { expect } from "vite-plus/test";
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

// Capture the surrounding pixels without changing the item's layout or focus.
export async function checkScreenshotWithPadding(
  target: ReturnType<typeof page.getByRole>,
  name: string,
) {
  const padding = 2;
  const bounds = target.element().getBoundingClientRect();
  const capture = document.createElement("div");
  capture.inert = true;
  Object.assign(capture.style, {
    position: "absolute",
    pointerEvents: "none",
    left: `${bounds.left + window.scrollX - padding}px`,
    top: `${bounds.top + window.scrollY - padding}px`,
    width: `${bounds.width + padding * 2}px`,
    height: `${bounds.height + padding * 2}px`,
  });
  document.body.append(capture);
  try {
    await expect.element(capture).toMatchScreenshot(name, {});
  } finally {
    capture.remove();
  }
}
