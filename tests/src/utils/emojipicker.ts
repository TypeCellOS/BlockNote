import { vi } from "vite-plus/test";
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
  await vi.waitFor(
    () => {
      const btn = document.querySelector<HTMLButtonElement>(
        `${EMOJI_PICKER_SELECTOR} .bn-frimousse-emoji`,
      );
      if (!btn) {
        throw new Error("No emoji buttons rendered yet");
      }
    },
    { timeout: 5000 },
  );
  await sleep(200);
  await userEvent.keyboard("{Enter}");
  await sleep(500);
}
