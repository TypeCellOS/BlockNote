import type { PartialBlock } from "@blocknote/core";
import { page } from "vite-plus/test/browser";
import { pressKey, selectToLineEndKey } from "@root/tests/a11y/helpers.js";

// The middle paragraph is selected; its neighbours provide navigation context.
export const toolbarDocument: PartialBlock[] = [
  { id: "preceding", type: "paragraph", content: "Preceding paragraph" },
  { id: "format", type: "paragraph", content: "Format this text" },
  { id: "following", type: "paragraph", content: "Following paragraph" },
];

// Start from "Before editor" after openEditor(). Keep the navigation steps
// identical to focusToolbarItemWithAssertions in the keyboard suite.
export async function focusToolbarItem(toolbarItem: string) {
  await focusEditor();
  const toolbar = await openToolbar();
  await focusToolbar();
  const target = toolbar.getByRole("button", {
    name: toolbarItem,
    exact: true,
  });
  while (document.activeElement !== target.element()) {
    await focusNextToolbarItem();
  }
  return { toolbar, button: target };
}

export function documentForToolbarItem(toolbarItem: string): PartialBlock[] {
  if (toolbarItem === "Unnest block") {
    return [
      {
        id: "preceding",
        type: "paragraph",
        content: "Preceding paragraph",
        children: [
          { id: "format", type: "paragraph", content: "Format this text" },
        ],
      },
    ];
  }
  return toolbarDocument;
}

// Each action has a single starting point; callers own focus assertions.
export async function focusEditor() {
  await pressKey("Tab");
  return page.getByRole("textbox");
}

// Select the second line to expose the formatting toolbar.
export async function openToolbar() {
  await pressKey("ArrowDown");
  await pressKey(selectToLineEndKey);
  return page.getByRole("toolbar");
}

export async function focusToolbar() {
  await pressKey("Tab");
}

export async function focusNextToolbarItem() {
  await pressKey("Tab");
}

export async function activateToolbarButton() {
  await pressKey("Enter");
}

export async function openToolbarMenu() {
  await pressKey("Enter");
}

export async function focusNextMenuItem() {
  await pressKey("ArrowDown");
}

export async function activateMenuItem() {
  await pressKey("Enter");
}

export async function openToolbarPopover() {
  await pressKey("Enter");
}
