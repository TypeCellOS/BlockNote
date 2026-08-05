import { userEvent } from "./context.js";
import { EMOJI_PICKER_SELECTOR } from "./const.js";
import { sleep, waitForSelector } from "./editor.js";

export async function openEmojiPicker() {
  await userEvent.keyboard(":");
}

export async function executeEmojiCommand(command: string) {
  await openEmojiPicker();
  await sleep(100);
  await userEvent.keyboard(command);
  await waitForSelector(EMOJI_PICKER_SELECTOR);
  await sleep(500);
  await userEvent.keyboard("{Enter}");
  await sleep(500);
}
