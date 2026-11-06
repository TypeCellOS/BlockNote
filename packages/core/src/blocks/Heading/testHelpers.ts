import { page } from "vite-plus/test/browser";
import { pressKey } from "@root/tests/a11y/helpers.js";

// Start from "Before editor" after openEditor(). Keep these navigation steps
// identical to focusToggleHeadingWithAssertions in the keyboard suite.
export async function focusToggleHeading() {
  const toggleButton = page.getByRole("button", {
    name: "Expand or collapse",
    exact: true,
  });
  while (document.activeElement !== toggleButton.element()) {
    await pressKey("Tab");
  }

  return toggleButton;
}
