import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
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

let submitCount: number;

beforeEach(async () => {
  submitCount = 0;
  await render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitCount += 1;
      }}
    >
      <App />
    </form>,
  );
  await waitForSelector(EDITOR_SELECTOR);
});

describe("Check Emoji Picker Functionality", () => {
  test("should show emoji picker when : is typed", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await waitForSelector(EMOJI_PICKER_SELECTOR);
  });
  test("should show emoji picker when : and query is typed", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await userEvent.keyboard("sm");
    await waitForSelector(EMOJI_PICKER_SELECTOR);
  });
  test("should leave Enter to the editor for a bare colon", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await waitForSelector(EMOJI_PICKER_SELECTOR);

    await userEvent.keyboard("{Enter}");

    await vi.waitFor(() => {
      const editor = document.querySelector(EDITOR_SELECTOR);
      expect(editor?.querySelectorAll(".bn-block-content").length).toBe(2);
      expect(editor?.textContent).toContain(":");
    });
  });
  test("Should be able to insert emoji", async () => {
    await focusOnEditor();
    await executeEmojiCommand("frog");
    await waitForTextInEditor("🐸 ");
  });
  test("should insert the selected skin tone with Enter", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await userEvent.keyboard("waving hand");
    await waitForSelector(".bn-frimousse-emoji[data-selected]");

    await userEvent.click(
      await waitForSelector("[frimousse-skin-tone-selector]"),
    );
    await vi.waitFor(() => {
      expect(
        document.querySelector(".bn-frimousse-emoji[data-selected]")
          ?.textContent,
      ).toBe("👋🏻");
    });

    document.querySelector<HTMLElement>(EDITOR_SELECTOR)?.focus();
    await userEvent.keyboard("{Enter}");
    await waitForTextInEditor("👋🏻 ");
  });
  test("should insert the selected skin tone when clicked", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await userEvent.keyboard("waving hand");
    await waitForSelector(".bn-frimousse-emoji[data-selected]");

    await userEvent.click(
      await waitForSelector("[frimousse-skin-tone-selector]"),
    );
    await userEvent.click(
      await waitForSelector(".bn-frimousse-emoji[data-selected]"),
    );

    await waitForTextInEditor("👋🏻 ");
    expect(document.querySelector(EDITOR_SELECTOR)?.textContent).not.toContain(
      "👋🏻 👋🏻",
    );
  });
  test("should not submit an enclosing form when an emoji is clicked", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await userEvent.keyboard("frog");
    const frog = await vi.waitFor(() => {
      const button = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          `${EMOJI_PICKER_SELECTOR} .bn-frimousse-emoji`,
        ),
      ).find((button) => button.textContent === "🐸");
      if (!button) {
        throw new Error("Frog emoji button did not render");
      }
      return button;
    });

    await userEvent.click(frog);

    expect(submitCount).toBe(0);
    await waitForTextInEditor("🐸 ");
  });
  test("should navigate emojis while focus remains in the editor", async () => {
    await focusOnEditor();
    const editor = await waitForSelector(EDITOR_SELECTOR);
    await openEmojiPicker();
    await userEvent.keyboard("sm");
    await waitForSelector(EMOJI_PICKER_SELECTOR);

    const selectedSelector = ".bn-frimousse-emoji[data-selected]";
    const first = await waitForSelector(selectedSelector);
    const firstEmoji = first.textContent;
    await userEvent.keyboard("{ArrowRight}");

    await vi.waitFor(() => {
      const selected =
        document.querySelector<HTMLButtonElement>(selectedSelector);
      if (!selected?.textContent || selected.textContent === firstEmoji) {
        throw new Error("Emoji selection did not move");
      }
    });

    await userEvent.keyboard("{Backspace}{Backspace}heart");
    const selectedAfterQuery = await vi.waitFor(() => {
      const selected =
        document.querySelector<HTMLButtonElement>(selectedSelector);
      const first = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".bn-frimousse-emoji"),
      ).find((button) => !button.closest("[aria-hidden]"));
      const activeDescendant = editor.getAttribute("aria-activedescendant");
      if (
        !selected ||
        !selected.textContent ||
        selected !== first ||
        !activeDescendant ||
        selected.id !== activeDescendant
      ) {
        throw new Error("Selection did not reset to the new first result");
      }
      expect(document.activeElement).toBe(editor);
      return selected.textContent;
    });

    await userEvent.keyboard("{Enter}");
    await waitForTextInEditor(`${selectedAfterQuery} `);
  });
  test("should clamp navigation to the last item in a partial row", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await userEvent.keyboard("keycap");
    await waitForSelector(".bn-frimousse-emoji[data-selected]");

    for (let index = 0; index < 8; index++) {
      await userEvent.keyboard("{ArrowRight}");
    }
    await userEvent.keyboard("{ArrowDown}");

    const lastEmoji = await vi.waitFor(() => {
      const selected = document.querySelector<HTMLButtonElement>(
        ".bn-frimousse-emoji[data-selected]",
      );
      if (selected?.textContent !== "🔟") {
        throw new Error("Selection did not clamp to the partial row");
      }
      return selected;
    });

    await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => {
      expect(document.querySelector(".bn-frimousse-emoji[data-selected]")).toBe(
        lastEmoji,
      );
    });
  });
  test("should keep keyboard selection visible while scrolling", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await userEvent.keyboard("a");
    const viewport = await waitForSelector("[frimousse-viewport]");

    for (let index = 0; index < 20; index++) {
      await userEvent.keyboard("{ArrowDown}");
    }

    await vi.waitFor(() => {
      const selected = document.querySelector<HTMLElement>(
        ".bn-frimousse-emoji[data-selected]",
      );
      if (!selected || viewport.scrollTop === 0) {
        throw new Error("Emoji selection did not scroll");
      }
      const viewportRect = viewport.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      expect(selectedRect.bottom).toBeGreaterThanOrEqual(viewportRect.top);
      expect(selectedRect.top).toBeLessThanOrEqual(viewportRect.bottom);
    });
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
    await userEvent.keyboard("frog");
    await waitForSelector(EMOJI_PICKER_SELECTOR);
    await vi.waitFor(
      () => {
        const btn = document.querySelector(
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
    await waitForTextInEditor("🐸 ");
  });
});
