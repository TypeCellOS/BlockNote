import { userEvent } from "./context.js";
import { SLASH_MENU_SELECTOR } from "./const.js";
import { sleep, waitForSelector } from "./editor.js";

export async function openSlashMenu() {
  await userEvent.keyboard("/");
  await waitForSelector(SLASH_MENU_SELECTOR);
}

export async function executeSlashCommand(command: string) {
  await openSlashMenu();
  await sleep(100);
  await userEvent.keyboard(command);
  await userEvent.keyboard("{Enter}");
  await sleep(500);
}
