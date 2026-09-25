import App from "@examples/01-basic/10-localization/src/App";
import { expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  focusOnEditor,
  waitForSelector,
  waitForTextInEditor,
} from "../../utils/editor.js";
import { openEmojiPicker } from "../../utils/emojipicker.js";

test("searches and inserts from localized emoji data without a CDN", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  await render(<App />);

  const languageSelect = document.querySelector("select");
  if (!languageSelect) {
    throw new Error("Language selector not found");
  }
  await userEvent.selectOptions(languageSelect, "fr");
  await waitForSelector(EDITOR_SELECTOR);
  await focusOnEditor();
  await openEmojiPicker();
  await userEvent.keyboard("zzzzzz");
  expect((await waitForSelector(".bn-frimousse-empty")).textContent).toBe(
    "Aucun emoji trouvé",
  );
  await userEvent.keyboard(
    "{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}",
  );
  await userEvent.keyboard("soleil");
  await userEvent.click(
    await waitForSelector('.bn-frimousse-emoji[aria-label="Soleil"]'),
  );

  await waitForTextInEditor("☀️ ");
  expect(fetchSpy).not.toHaveBeenCalled();
});
