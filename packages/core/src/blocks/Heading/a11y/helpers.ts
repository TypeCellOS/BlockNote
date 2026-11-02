import { page } from "vite-plus/test/browser";
import { pressKey } from "@root/tests/a11y/helpers.js";

// Reset only this fixture's persisted expansion state.
export function resetToggleHeading() {
  localStorage.removeItem("toggle-read-only-toggle-heading");
}

export async function focusNextItem() {
  await pressKey("Tab");
}

export async function activateToggleHeading() {
  await pressKey("Enter");
}

// Start from "Before editor" after openEditor(). Keep these navigation steps
// identical to focusToggleHeadingWithAssertions in the keyboard suite.
export async function focusToggleHeading() {
  const toggleButton = page.getByRole("button", {
    name: "Expand or collapse",
    exact: true,
  });
  while (document.activeElement !== toggleButton.element()) {
    await focusNextItem();
  }

  return toggleButton;
}
