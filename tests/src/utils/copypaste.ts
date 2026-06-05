import { MOD, userEvent } from "./context.js";
import { waitForSelector } from "./editor.js";

export function selectAll() {
  return userEvent.keyboard(`{${MOD}>}a{/${MOD}}`);
}

export async function copyPaste() {
  await userEvent.keyboard(`{${MOD}>}c{/${MOD}}`);
  // Exit out of any menus/toolbars which may block the trailing block.
  await userEvent.keyboard("{Escape}");
  await userEvent.click(await waitForSelector(".bn-trailing-block"));
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
