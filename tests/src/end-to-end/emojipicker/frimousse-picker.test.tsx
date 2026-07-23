import "@blocknote/mantine/style.css";
import FrimoussePicker from "@blocknote/react/components/Comments/FrimoussePicker";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";

function emojiButtons(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>("[frimousse-emoji]"),
  );
}

function waitForEmojiButtons(min = 1): Promise<HTMLButtonElement[]> {
  return vi.waitFor(
    () => {
      const buttons = emojiButtons();
      if (buttons.length < min) {
        throw new Error(`Emoji picker not ready (found ${buttons.length})`);
      }
      return buttons;
    },
    { timeout: 10000 },
  );
}

function activeEmoji(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    ".bn-frimousse-emoji[data-active]",
  );
}

function activeEmojiLabel(): string | null {
  return (
    document.querySelector(".bn-frimousse-active-emoji-label")?.textContent ??
    null
  );
}

describe("FrimoussePicker — isolated component", () => {
  let onEmojiSelect: (emoji: { native: string }) => void;

  beforeEach(async () => {
    onEmojiSelect = vi.fn();
    await render(<FrimoussePicker locale="en" onEmojiSelect={onEmojiSelect} />);
    await waitForEmojiButtons();
  });

  test("renders emoji buttons after data loads", async () => {
    const buttons = emojiButtons();
    expect(buttons.length).toBeGreaterThan(0);
  });

  test("clicking an emoji calls onEmojiSelect with the native character", async () => {
    const buttons = await waitForEmojiButtons(2);
    const char = buttons[0].textContent;

    await userEvent.click(buttons[0]);

    expect(onEmojiSelect).toHaveBeenCalledWith({ native: char });
  });

  test("hovering an emoji highlights it and shows its label in the footer", async () => {
    const buttons = await waitForEmojiButtons(2);

    await userEvent.hover(buttons[1]);

    await vi.waitFor(() => {
      const active = activeEmoji();
      if (!active) {
        throw new Error("No highlighted emoji after hover");
      }
      expect(active.textContent).toBe(buttons[1].textContent);
    });

    const label = activeEmojiLabel();
    expect(label).toBeTruthy();
  });

  test("arrow key navigation highlights emojis sequentially", async () => {
    // Focus the search input to enable keyboard navigation.
    const search =
      document.querySelector<HTMLInputElement>("[frimousse-search]");
    expect(search).toBeTruthy();
    await userEvent.click(search!);

    // First arrow press activates the first emoji.
    await userEvent.keyboard("{ArrowDown}");

    await vi.waitFor(() => {
      if (!activeEmoji()) {
        throw new Error("No highlighted emoji after first ArrowDown");
      }
    });

    const firstActive = activeEmoji()!.textContent;

    // ArrowRight should move to the next emoji.
    await userEvent.keyboard("{ArrowRight}");

    await vi.waitFor(() => {
      const current = activeEmoji();
      if (!current || current.textContent === firstActive) {
        throw new Error("Highlighted emoji did not advance after ArrowRight");
      }
    });
  });

  test("ArrowDown moves the highlight to the next row", async () => {
    const search =
      document.querySelector<HTMLInputElement>("[frimousse-search]");
    await userEvent.click(search!);

    await userEvent.keyboard("{ArrowDown}");
    await vi.waitFor(() => {
      if (!activeEmoji()) {
        throw new Error("No highlighted emoji");
      }
    });

    const before = activeEmoji()!.textContent;

    await userEvent.keyboard("{ArrowDown}");

    await vi.waitFor(() => {
      const current = activeEmoji();
      if (!current || current.textContent === before) {
        throw new Error("Highlighted emoji did not change after ArrowDown");
      }
    });
  });

  test("Enter selects the currently highlighted emoji", async () => {
    const search =
      document.querySelector<HTMLInputElement>("[frimousse-search]");
    await userEvent.click(search!);

    await userEvent.keyboard("{ArrowDown}");
    await vi.waitFor(() => {
      if (!activeEmoji()) {
        throw new Error("No highlighted emoji");
      }
    });

    const activeChar = activeEmoji()!.textContent;
    await userEvent.keyboard("{Enter}");

    expect(onEmojiSelect).toHaveBeenCalledWith({ native: activeChar });
  });

  test("scrolls viewport when navigating past visible rows and keeps highlight visible", async () => {
    const search =
      document.querySelector<HTMLInputElement>("[frimousse-search]");
    await userEvent.click(search!);

    // Activate the first emoji.
    await userEvent.keyboard("{ArrowDown}");
    await vi.waitFor(() => {
      if (!activeEmoji()) {
        throw new Error("No highlighted emoji");
      }
    });

    const viewport = document.querySelector<HTMLElement>(
      "[frimousse-viewport]",
    )!;
    expect(viewport).toBeTruthy();

    // Press ArrowDown enough times to scroll past the initial viewport.
    // Frimousse uses 9 columns by default, so each ArrowDown jumps one row.
    const presses = 20;
    for (let i = 0; i < presses; i++) {
      await userEvent.keyboard("{ArrowDown}");
    }

    await vi.waitFor(() => {
      const current = activeEmoji();
      if (!current) {
        throw new Error("Highlight lost after scrolling");
      }

      // The viewport must have scrolled from its initial position.
      if (viewport.scrollTop === 0) {
        throw new Error("Viewport did not scroll");
      }

      // The highlighted button must be within the visible area.
      const vRect = viewport.getBoundingClientRect();
      const eRect = current.getBoundingClientRect();
      if (eRect.bottom < vRect.top || eRect.top > vRect.bottom) {
        throw new Error("Highlighted emoji is outside the visible viewport");
      }
    });
  });

  test("footer updates to show the keyboard-navigated emoji label", async () => {
    const search =
      document.querySelector<HTMLInputElement>("[frimousse-search]");
    await userEvent.click(search!);

    await userEvent.keyboard("{ArrowDown}");
    await vi.waitFor(() => {
      if (!activeEmoji()) {
        throw new Error("No highlighted emoji");
      }
    });

    const expectedLabel = activeEmoji()!.getAttribute("aria-label");
    const footerLabel = activeEmojiLabel();
    expect(footerLabel).toBe(expectedLabel);
  });
});
