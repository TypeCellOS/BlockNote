import type { PartialBlock } from "@blocknote/core";
import { expect } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import {
  pressKey,
  readSelection,
  selectToLineEndKey,
} from "../../../../../../tests/a11y/helpers.js";

// The middle paragraph is selected; its neighbours provide navigation context.
export const toolbarDocument: PartialBlock[] = [
  { id: "preceding", type: "paragraph", content: "Preceding paragraph" },
  { id: "format", type: "paragraph", content: "Format this text" },
  { id: "following", type: "paragraph", content: "Following paragraph" },
];

// Enter the editor from "Before editor", select its second line, then Tab to
// the requested control. Each test supplies its own document before calling this.
// Shared by browser assertions and the native screen reader journey.
export async function focusToolbarControl(control: string) {
  await pressKey("Tab");
  await expect.element(page.getByRole("textbox")).toHaveFocus();
  // Move from the first line to the target and select to its end (OS-specific key).
  await pressKey("ArrowDown");
  await pressKey(selectToLineEndKey);
  await expect.poll(async () => readSelection().text).toBe("Format this text");
  const toolbar = page.getByRole("toolbar");
  await expect.element(toolbar).toBeVisible();
  await expect.poll(() => toolbar.getByRole("button").all().length).toBe(12);

  const button = toolbar.getByRole("button", { name: control, exact: true });
  await expect.element(button).toBeEnabled();
  // Bound traversal to report unreachable controls without looping forever.
  for (let step = 0; step < 15; step++) {
    if (button.element() === document.activeElement) {
      break;
    }
    await pressKey("Tab");
  }
  await expect
    .element(button, { message: `${control} is reachable with Tab` })
    .toHaveFocus();
  return { toolbar, button };
}
