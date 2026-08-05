import { MOD, userEvent } from "./context.js";

export function selectAll() {
  return userEvent.keyboard(`{${MOD}>}a{/${MOD}}`);
}

export async function copyPaste() {
  await userEvent.keyboard(`{${MOD}>}c{/${MOD}}`);
  // Exit out of any menus/toolbars which may block the trailing block.
  await userEvent.keyboard("{Escape}");
  // The trailing block isn't always present (e.g. when the editor's last block
  // can't have one), so fall back to the last paragraph.
  const trailingBlock =
    document.querySelector<HTMLElement>(".bn-trailing-block");
  if (trailingBlock) {
    await userEvent.click(trailingBlock);
  } else {
    const paragraphs = document.querySelectorAll<HTMLElement>(
      '[data-content-type="paragraph"]',
    );
    await userEvent.click(paragraphs[paragraphs.length - 1]);
  }
  await userEvent.keyboard(`{${MOD}>}v{/${MOD}}`);
}

export async function copyPasteAll() {
  await selectAll();
  await copyPaste();
}

export async function insertParagraph() {
  await userEvent.keyboard("Paragraph");
}

export async function insertHeading(headingLevel: number) {
  for (let i = 0; i < headingLevel; i++) {
    await userEvent.keyboard("#");
  }
  await userEvent.keyboard(" ");
  await userEvent.keyboard("Heading");
}

export async function startList(ordered: boolean) {
  if (ordered) {
    await userEvent.keyboard("1. ");
  } else {
    await userEvent.keyboard("- ");
  }
}

export async function insertListItems() {
  await userEvent.keyboard("List Item 1");
  await userEvent.keyboard("{Enter}");
  await userEvent.keyboard("List Item 2");
  await userEvent.keyboard("{Enter}");
  await userEvent.keyboard("List Item 3");
}

export async function insertNestedListItems() {
  await userEvent.keyboard("List Item 1");
  await userEvent.keyboard("{Enter}");
  await userEvent.keyboard("{Tab}");
  await userEvent.keyboard("List Item 2");
  await userEvent.keyboard("{Enter}");
  await userEvent.keyboard("{Tab}");
  await userEvent.keyboard("List Item 3");
}
