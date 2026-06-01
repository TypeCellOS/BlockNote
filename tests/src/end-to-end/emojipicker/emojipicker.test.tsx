import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, EMOJI_PICKER_SELECTOR } from "../../utils/const.js";
import {
  focusOnEditor,
  sleep,
  waitForSelector,
  waitForTextInEditor,
} from "../../utils/editor.js";
import {
  executeEmojiCommand,
  openEmojiPicker,
} from "../../utils/emojipicker.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Emoji Picker Functionality", () => {
  test("should not show emoji picker when : is typed", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    expect(document.querySelectorAll(EMOJI_PICKER_SELECTOR).length).toBe(0);
  });
  test("should show emoji picker when : and query is typed", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await userEvent.keyboard("sm");
    await waitForSelector(EMOJI_PICKER_SELECTOR);
  });
  test("Should be able to insert emoji", async () => {
    await focusOnEditor();
    await executeEmojiCommand("sm");
    await waitForTextInEditor("🛩️ ");
  });
  test("Should be able to open emoji picker from slash menu", async () => {
    await focusOnEditor();
    await executeSlashCommand("emoji");
    await userEvent.keyboard("sm");
    await waitForSelector(EMOJI_PICKER_SELECTOR);
  });
  test("Should be able to insert emoji after slash command", async () => {
    await focusOnEditor();
    await executeSlashCommand("emoji");
    await userEvent.keyboard("sm");
    await waitForSelector(EMOJI_PICKER_SELECTOR);
    await sleep(500);
    await userEvent.keyboard("{Enter}");
    await waitForTextInEditor("🛩️ ");
  });
});
