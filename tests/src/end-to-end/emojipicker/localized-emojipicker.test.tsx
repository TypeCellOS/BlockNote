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
import { waitForSelectedEmoji } from "../../utils/emojipicker.js";

test("searches and inserts from localized emoji data without a CDN", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  try {
    await render(<App />);

    await userEvent.selectOptions(await waitForSelector("select"), "fr");
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await userEvent.keyboard(":zzzzzz");
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
  } finally {
    fetchSpy.mockRestore();
  }
});

test.each([
  { language: "fr", query: "soléil" },
  { language: "tr", query: "IŞIK" },
])(
  "keeps displayed results and Enter selection consistent for $language query $query",
  async ({ language, query }) => {
    await render(<App />);
    await userEvent.selectOptions(await waitForSelector("select"), language);
    await focusOnEditor();
    await userEvent.keyboard(`:${query}`);

    // These queries require accent folding / Turkish dotless-I casing. Testing
    // only the search helper misses Frimousse independently filtering the UI.
    const selected = await waitForSelectedEmoji();
    const visibleButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(".bn-frimousse-emoji"),
    ).filter((button) => !button.closest("[aria-hidden]"));
    expect(visibleButtons[0]).toBe(selected);
    expect(selected.getAttribute("aria-selected")).toBe("true");
    const emoji = selected.textContent;
    expect(emoji).toBeTruthy();

    await userEvent.keyboard("{Enter}");
    await waitForTextInEditor(`${emoji} `);
    expect(document.querySelector(EDITOR_SELECTOR)?.textContent).toBe(
      `${emoji} `,
    );
  },
);

test("preserves edits when switching languages repeatedly", async () => {
  await render(<App />);
  await focusOnEditor();
  await userEvent.keyboard("Keep my document");
  await waitForTextInEditor("Keep my document");

  for (const language of ["fr", "tr", "en"]) {
    await userEvent.selectOptions(await waitForSelector("select"), language);
    await waitForTextInEditor("Keep my document");
    expect(document.querySelector(EDITOR_SELECTOR)?.textContent).toBe(
      "Keep my document",
    );
  }
});
