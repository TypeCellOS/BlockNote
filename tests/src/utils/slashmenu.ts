import { expect } from "vite-plus/test";
import { userEvent } from "./context.js";
import { SLASH_MENU_SELECTOR } from "./const.js";
import { waitForSelector, waitForSelectorDetached } from "./editor.js";

const SELECTED_OPTION = `${SLASH_MENU_SELECTOR} [role="option"][aria-selected="true"]`;
const COMMAND_TITLES = {
  bullet: "Bullet List",
  emoji: "Emoji",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  image: "Image",
  numbered: "Numbered List",
  paragraph: "Paragraph",
  table: "Table",
} as const;

export async function openSlashMenu() {
  await userEvent.keyboard("/");
  await waitForSelector(SELECTED_OPTION);
}

export async function executeSlashCommand(
  command: keyof typeof COMMAND_TITLES,
) {
  await openSlashMenu();
  await userEvent.keyboard(command);
  // Results load asynchronously. Don't submit while the old result is selected.
  await expect
    .poll(() => document.querySelector(SELECTED_OPTION)?.textContent)
    .toContain(COMMAND_TITLES[command]);
  await userEvent.keyboard("{Enter}");
  await waitForSelectorDetached(SLASH_MENU_SELECTOR);
}
