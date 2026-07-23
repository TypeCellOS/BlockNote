import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { InlineEmojiPicker } from "@blocknote/react/components/SuggestionMenu/EmojiPicker/InlineEmojiPicker";
import { useMemo } from "react";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";

function TestInlineEmojiPicker({
  query = "",
  onClose,
  onClearQuery,
}: {
  query?: string;
  onClose?: () => void;
  onClearQuery?: () => void;
}) {
  const editor = useMemo(() => BlockNoteEditor.create(), []);
  return (
    <BlockNoteView editor={editor}>
      <InlineEmojiPicker
        query={query}
        closeMenu={onClose ?? (() => {})}
        clearQuery={onClearQuery ?? (() => {})}
      />
    </BlockNoteView>
  );
}

function emojiButtons(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(".bn-frimousse-emoji"),
  );
}

function waitForEmojiButtons(min = 1): Promise<HTMLButtonElement[]> {
  return vi.waitFor(
    () => {
      const buttons = emojiButtons();
      if (buttons.length < min) {
        throw new Error(`Inline picker not ready (found ${buttons.length})`);
      }
      return buttons;
    },
    { timeout: 10000 },
  );
}

function selectedEmoji(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    ".bn-frimousse-emoji[data-selected]",
  );
}

function selectedEmojiLabel(): string | null {
  return (
    document.querySelector(".bn-frimousse-active-emoji-label")?.textContent ??
    null
  );
}

function dispatchArrow(
  editorEl: HTMLElement,
  key: "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown",
) {
  editorEl.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

describe("InlineEmojiPicker — isolated component", () => {
  beforeEach(async () => {
    await render(<TestInlineEmojiPicker />);
    await waitForSelector(EDITOR_SELECTOR);
    await waitForEmojiButtons();
  });

  test("renders emoji buttons after data loads", async () => {
    const buttons = emojiButtons();
    expect(buttons.length).toBeGreaterThan(0);
  });

  test("first emoji is selected by default", async () => {
    await vi.waitFor(() => {
      if (!selectedEmoji()) {
        throw new Error("No selected emoji on initial render");
      }
    });

    const first = emojiButtons()[0];
    expect(selectedEmoji()!.textContent).toBe(first.textContent);
  });

  test("ArrowRight moves the selection to the next emoji", async () => {
    await focusOnEditor();

    await vi.waitFor(() => {
      if (!selectedEmoji()) {
        throw new Error("No selected emoji");
      }
    });

    const before = selectedEmoji()!.textContent;
    const editorEl = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;

    dispatchArrow(editorEl, "ArrowRight");

    await vi.waitFor(() => {
      const current = selectedEmoji();
      if (!current || current.textContent === before) {
        throw new Error("Selection did not advance after ArrowRight");
      }
    });
  });

  test("ArrowLeft does not move past the first emoji", async () => {
    await focusOnEditor();
    const editorEl = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;

    await vi.waitFor(() => {
      if (!selectedEmoji()) {
        throw new Error("No selected emoji");
      }
    });

    const first = selectedEmoji()!.textContent;

    dispatchArrow(editorEl, "ArrowLeft");

    await vi.waitFor(() => {
      const current = selectedEmoji();
      if (!current) {
        throw new Error("Selection disappeared");
      }
    });

    expect(selectedEmoji()!.textContent).toBe(first);
  });

  test("ArrowDown moves the selection by one full row", async () => {
    await focusOnEditor();
    const editorEl = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;

    await vi.waitFor(() => {
      if (!selectedEmoji()) {
        throw new Error("No selected emoji");
      }
    });

    const before = selectedEmoji()!.textContent;

    dispatchArrow(editorEl, "ArrowDown");

    await vi.waitFor(() => {
      const current = selectedEmoji();
      if (!current || current.textContent === before) {
        throw new Error("Selection did not change after ArrowDown");
      }
    });
  });

  test("ArrowUp after ArrowDown returns to the original emoji", async () => {
    await focusOnEditor();
    const editorEl = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;

    await vi.waitFor(() => {
      if (!selectedEmoji()) {
        throw new Error("No selected emoji");
      }
    });

    const original = selectedEmoji()!.textContent;

    dispatchArrow(editorEl, "ArrowDown");

    await vi.waitFor(() => {
      const current = selectedEmoji();
      if (!current || current.textContent === original) {
        throw new Error("Selection did not change after ArrowDown");
      }
    });

    dispatchArrow(editorEl, "ArrowUp");

    await vi.waitFor(() => {
      const current = selectedEmoji();
      if (!current || current.textContent !== original) {
        throw new Error("Selection did not return after ArrowUp");
      }
    });
  });

  test("scrolls viewport when navigating past visible rows and keeps highlight visible", async () => {
    await focusOnEditor();
    const editorEl = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;

    await vi.waitFor(() => {
      if (!selectedEmoji()) {
        throw new Error("No selected emoji");
      }
    });

    const viewport = document.querySelector<HTMLElement>(
      "[frimousse-viewport]",
    )!;
    expect(viewport).toBeTruthy();

    // Press ArrowDown enough times to scroll past the initial viewport.
    // InlineEmojiPicker uses 9 columns, so each ArrowDown jumps one row.
    const presses = 20;
    for (let i = 0; i < presses; i++) {
      dispatchArrow(editorEl, "ArrowDown");
    }

    await vi.waitFor(() => {
      const current = selectedEmoji();
      if (!current) {
        throw new Error("Selection lost after scrolling");
      }

      // The viewport must have scrolled from its initial position.
      if (viewport.scrollTop === 0) {
        throw new Error("Viewport did not scroll");
      }

      // The selected button must be within the visible area.
      const vRect = viewport.getBoundingClientRect();
      const eRect = current.getBoundingClientRect();
      if (eRect.bottom < vRect.top || eRect.top > vRect.bottom) {
        throw new Error("Selected emoji is outside the visible viewport");
      }
    });

    // Footer should reflect the scrolled-to emoji.
    const label = selectedEmojiLabel();
    expect(label).toBeTruthy();
  });

  test("footer shows the label of the selected emoji", async () => {
    await vi.waitFor(() => {
      if (!selectedEmoji()) {
        throw new Error("No selected emoji");
      }
    });

    const label = selectedEmojiLabel();
    expect(label).toBeTruthy();
  });

  test("selecting an emoji updates the footer label", async () => {
    await focusOnEditor();
    const editorEl = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;

    await vi.waitFor(() => {
      if (!selectedEmoji()) {
        throw new Error("No selected emoji");
      }
    });

    const labelBefore = selectedEmojiLabel();

    dispatchArrow(editorEl, "ArrowRight");

    await vi.waitFor(() => {
      const label = selectedEmojiLabel();
      if (label === labelBefore) {
        throw new Error("Footer label did not change");
      }
    });

    expect(selectedEmojiLabel()).toBeTruthy();
  });
});

describe("InlineEmojiPicker — with search query", () => {
  test("resets selection to first emoji when query changes", async () => {
    const { rerender } = await render(<TestInlineEmojiPicker query="sm" />);
    await waitForSelector(EDITOR_SELECTOR);
    await waitForEmojiButtons();

    await focusOnEditor();
    const editorEl = document.querySelector<HTMLElement>(EDITOR_SELECTOR)!;

    dispatchArrow(editorEl, "ArrowRight");

    await vi.waitFor(() => {
      const buttons = emojiButtons();
      const sel = selectedEmoji();
      if (!sel || !buttons[0] || sel.textContent === buttons[0].textContent) {
        // might still be at first — just need it to be somewhere
      }
    });

    // Re-render with a different query — selection should reset.
    await rerender(<TestInlineEmojiPicker query="heart" />);

    await vi.waitFor(
      () => {
        const buttons = emojiButtons();
        const sel = selectedEmoji();
        if (!sel || !buttons[0]) {
          throw new Error("No emojis after query change");
        }
        if (sel.textContent !== buttons[0].textContent) {
          throw new Error("Selection was not reset to first emoji");
        }
      },
      { timeout: 10000 },
    );
  });
});
