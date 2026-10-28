import { vi } from "vite-plus/test";
import { userEvent } from "./context.js";
import { EDITOR_SELECTOR, EMOJI_PICKER_SELECTOR } from "./const.js";

export async function openEmojiPicker() {
  await userEvent.keyboard(":");
}

export async function executeEmojiCommand(command: string) {
  await openEmojiPicker();
  await userEvent.keyboard(command);
  await waitForSelectedEmoji();
  await userEvent.keyboard("{Enter}");
}

/** Wait for both the rendered result and the editor's keyboard bridge. */
export async function waitForSelectedEmoji() {
  return vi.waitFor(
    () => {
      const btn = document.querySelector<HTMLButtonElement>(
        `${EMOJI_PICKER_SELECTOR} .bn-frimousse-emoji[data-selected]`,
      );
      const activeDescendant = document
        .querySelector(EDITOR_SELECTOR)
        ?.getAttribute("aria-activedescendant");
      if (!btn || !activeDescendant || btn.id !== activeDescendant) {
        throw new Error("Emoji keyboard selection is not ready");
      }
      return btn;
    },
    { timeout: 5000 },
  );
}

/** Screenshots must include the first category, not a partially scrolled mount. */
export async function waitForEmojiPickerLayout() {
  await waitForSelectedEmoji();
  await vi.waitFor(() => {
    const viewport = document.querySelector<HTMLElement>(
      `${EMOJI_PICKER_SELECTOR} [frimousse-viewport]`,
    );
    const header = Array.from(
      document.querySelectorAll<HTMLElement>(
        `${EMOJI_PICKER_SELECTOR} [frimousse-category-header]`,
      ),
    ).find((element) => !element.closest("[aria-hidden]"));
    if (!viewport || !header) {
      throw new Error("Emoji category header has not rendered");
    }
    const viewportRect = viewport.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    if (
      headerRect.height === 0 ||
      headerRect.top < viewportRect.top ||
      headerRect.bottom > viewportRect.bottom
    ) {
      throw new Error("First emoji category header is not fully visible");
    }
  });
}
