import App from "@examples/01-basic/testing/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, EMOJI_PICKER_SELECTOR } from "../../utils/const.js";
import {
  focusOnEditor,
  waitForSelector,
  waitForTextInEditor,
} from "../../utils/editor.js";
import {
  executeEmojiCommand,
  openEmojiPicker,
  waitForSelectedEmoji,
} from "../../utils/emojipicker.js";
import { executeSlashCommand } from "../../utils/slashmenu.js";

let submitCount: number;

function editorCaretOffset(editor: HTMLElement) {
  const selection = window.getSelection()!;
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.setEnd(selection.anchorNode!, selection.anchorOffset);
  return range.toString().length;
}

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
  test("should open only after two characters and select the top-left emoji", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull();
    await userEvent.keyboard("s");
    expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull();
    await userEvent.keyboard("m");
    await waitForSelector(EMOJI_PICKER_SELECTOR);
    await vi.waitFor(() => {
      const selected = document.querySelector(
        ".bn-frimousse-emoji[data-selected]",
      );
      expect(selected).not.toBeNull();
      expect(selected?.getAttribute("aria-colindex")).toBe("0");
      expect(
        selected?.closest("[aria-rowindex]")?.getAttribute("aria-rowindex"),
      ).toBe("0");
      expect(selected?.id).toBe(
        document
          .querySelector(EDITOR_SELECTOR)
          ?.getAttribute("aria-activedescendant"),
      );
    });
    await userEvent.keyboard("{Backspace}");
    await vi.waitFor(() =>
      expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull(),
    );
  });
  test("should leave Enter to the editor for a bare colon", async () => {
    await focusOnEditor();
    await openEmojiPicker();

    await userEvent.keyboard("{Enter}");

    await vi.waitFor(() => {
      const editor = document.querySelector(EDITOR_SELECTOR);
      expect(editor?.querySelectorAll(".bn-block-content").length).toBe(2);
      expect(editor?.textContent).toContain(":");
    });
  });
  test("should navigate and reveal emoji rows without moving the editor caret", async () => {
    await focusOnEditor();
    const editor = await waitForSelector(EDITOR_SELECTOR);
    await openEmojiPicker();
    await userEvent.keyboard("an");
    const selector = ".bn-frimousse-emoji[data-selected]";
    const first = await waitForSelector(selector);
    const firstEmoji = first.textContent;
    const selection = window.getSelection()!;
    const anchorNode = selection.anchorNode;
    const anchorOffset = selection.anchorOffset;

    await userEvent.keyboard("{ArrowRight}");
    await vi.waitFor(() => {
      const selected = document.querySelector(selector);
      expect(selected?.textContent).not.toBe(firstEmoji);
      expect(selected?.getAttribute("aria-colindex")).toBe("1");
      expect(selected?.getAttribute("aria-selected")).toBe("true");
      expect(selected?.id).toBe(editor.getAttribute("aria-activedescendant"));
    });

    await userEvent.keyboard("{ArrowDown}".repeat(12));
    const viewport = await waitForSelector("[frimousse-viewport]");
    await vi.waitFor(() => {
      const selected = document.querySelector<HTMLElement>(selector);
      expect(
        selected?.closest("[aria-rowindex]")?.getAttribute("aria-rowindex"),
      ).toBe("12");
      expect(selected?.textContent).not.toBe(firstEmoji);
      expect(selected?.id).toBe(editor.getAttribute("aria-activedescendant"));
      const rect = selected!.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      expect(rect.top).toBeGreaterThanOrEqual(viewportRect.top);
      expect(rect.bottom).toBeLessThanOrEqual(viewportRect.bottom);
      expect(viewport.scrollTop).toBeGreaterThan(0);
    });

    await userEvent.keyboard("{ArrowUp}");
    await vi.waitFor(() => {
      const selected = document.querySelector(selector);
      expect(
        selected?.closest("[aria-rowindex]")?.getAttribute("aria-rowindex"),
      ).toBe("11");
      expect(selected?.id).toBe(editor.getAttribute("aria-activedescendant"));
      expect(document.activeElement).toBe(editor);
      expect(selection.anchorNode).toBe(anchorNode);
      expect(selection.anchorOffset).toBe(anchorOffset);
      expect(editor.textContent).toBe(":an");
    });
  });
  test("Should be able to insert emoji", async () => {
    await focusOnEditor();
    await executeEmojiCommand("frog");
    await waitForTextInEditor("🐸 ");
  });
  test("should preserve the selected skin tone when the query changes and insert with Enter", async () => {
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
    // A query change remounts the filtered Frimousse view, not its skin tone.
    await userEvent.keyboard(" ");
    await vi.waitFor(async () => {
      expect((await waitForSelectedEmoji()).textContent).toBe("👋🏻");
    });
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
    const tonedEmoji = await vi.waitFor(() => {
      const selected = document.querySelector<HTMLElement>(
        ".bn-frimousse-emoji[data-selected]",
      );
      expect(selected?.textContent).toBe("👋🏻");
      return selected!;
    });
    await userEvent.click(tonedEmoji);

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

    expect(lastEmoji.getAttribute("aria-selected")).toBe("true");
  });
  test("should wrap horizontally between neighboring rows", async () => {
    await focusOnEditor();
    await openEmojiPicker();
    await userEvent.keyboard("keycap");
    await waitForSelector(".bn-frimousse-emoji[data-selected]");
    const selection = window.getSelection()!;
    const offset = selection.anchorOffset;
    await userEvent.keyboard("{ArrowRight}".repeat(9));
    await vi.waitFor(() => {
      const selected = document.querySelector(
        ".bn-frimousse-emoji[data-selected]",
      );
      expect(
        selected?.closest("[aria-rowindex]")?.getAttribute("aria-rowindex"),
      ).toBe("1");
      expect(selected?.getAttribute("aria-colindex")).toBe("0");
    });
    await userEvent.keyboard("{ArrowLeft}");
    await vi.waitFor(() => {
      const selected = document.querySelector(
        ".bn-frimousse-emoji[data-selected]",
      );
      expect(
        selected?.closest("[aria-rowindex]")?.getAttribute("aria-rowindex"),
      ).toBe("0");
      expect(selected?.getAttribute("aria-colindex")).toBe("8");
      expect(selected?.id).toBe(
        document
          .querySelector(EDITOR_SELECTOR)
          ?.getAttribute("aria-activedescendant"),
      );
      expect(selection.anchorOffset).toBe(offset);
    });
  });
  test.each(["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"])(
    "should leave %s at a grid boundary to the editor",
    async (key) => {
      await focusOnEditor();
      const editor = await waitForSelector(EDITOR_SELECTOR);
      await userEvent.keyboard(" tail");
      window
        .getSelection()!
        .collapse(editor.querySelector(".bn-inline-content")!.firstChild, 0);
      // A synthetic caret change must reach ProseMirror before typing;
      // merely waiting one animation frame can leave its selection stale.
      document.dispatchEvent(new Event("selectionchange"));
      expect(editorCaretOffset(editor)).toBe(0);
      await userEvent.keyboard(":keycap");
      await waitForSelector(".bn-frimousse-emoji[data-selected]");
      expect(editor.textContent).toBe(":keycap tail");
      if (key === "ArrowRight" || key === "ArrowDown") {
        await userEvent.keyboard("{ArrowRight}".repeat(8) + "{ArrowDown}");
        await waitForSelector(
          '.bn-frimousse-emoji[data-selected][aria-label="Keycap: 10"]',
        );
      }
      const offset = editorCaretOffset(editor);
      // Runs after the picker's capture handler but before ProseMirror's
      // bubble handler: check who consumed the real keyboard event.
      const observed: boolean[] = [];
      function observe(event: KeyboardEvent) {
        if (event.key === key) {
          observed.push(event.defaultPrevented);
        }
      }
      editor.addEventListener("keydown", observe, true);
      try {
        await userEvent.keyboard(`{${key}}`);
        expect(observed).toEqual([false]);
        expect(document.activeElement).toBe(editor);
        if (key === "ArrowLeft" || key === "ArrowRight") {
          await vi.waitFor(() =>
            expect(editorCaretOffset(editor)).toBe(
              offset + (key === "ArrowLeft" ? -1 : 1),
            ),
          );
        }
      } finally {
        editor.removeEventListener("keydown", observe, true);
      }
    },
  );
  test.each(["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"])(
    "should not consume %s when there are no results",
    async (key) => {
      await focusOnEditor();
      const editor = await waitForSelector(EDITOR_SELECTOR);
      await userEvent.keyboard(":zzzzzz");
      expect((await waitForSelector(".bn-frimousse-empty")).textContent).toBe(
        "No emoji found",
      );
      const observed: boolean[] = [];
      function observe(event: KeyboardEvent) {
        if (event.key === key) {
          observed.push(event.defaultPrevented);
        }
      }
      editor.addEventListener("keydown", observe, true);
      try {
        await userEvent.keyboard(`{${key}}`);
        expect(observed).toEqual([false]);
        expect(document.activeElement).toBe(editor);
      } finally {
        editor.removeEventListener("keydown", observe, true);
      }
    },
  );
  test("should dismiss with Escape and continue typing at the same caret", async () => {
    await focusOnEditor();
    const editor = await waitForSelector(EDITOR_SELECTOR);
    await userEvent.keyboard(":keycap");
    await waitForSelector(".bn-frimousse-emoji[data-selected]");
    const offset = editorCaretOffset(editor);
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => {
      expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull();
      expect(document.activeElement).toBe(editor);
      expect(editorCaretOffset(editor)).toBe(offset);
      expect(editor.getAttribute("aria-activedescendant")).toBeNull();
    });
    await userEvent.keyboard("s");
    expect(editor.textContent).toBe(":keycaps");
  });
  test("should expose the editor selection rather than the hovered emoji", async () => {
    await focusOnEditor();
    const editor = await waitForSelector(EDITOR_SELECTOR);
    await openEmojiPicker();
    await userEvent.keyboard("keycap");
    await waitForSelector(
      '.bn-frimousse-emoji[data-selected][aria-label="Keycap: #"]',
    );
    await userEvent.keyboard("{ArrowRight}");

    await vi.waitFor(() => {
      const selected = document.querySelector(
        ".bn-frimousse-emoji[data-selected]",
      );
      expect(selected?.getAttribute("aria-label")).toBe("Keycap: *");
      expect(selected?.getAttribute("aria-selected")).toBe("true");
      expect(
        document.querySelectorAll('.bn-frimousse-emoji[aria-selected="true"]'),
      ).toHaveLength(1);
      expect(selected?.id).toBe(editor.getAttribute("aria-activedescendant"));
    });

    // Query again after Frimousse's asynchronous filtering/virtualization.
    const firstSelector = '.bn-frimousse-emoji[aria-label="Keycap: #"]';
    const first = await waitForSelector(firstSelector);
    first.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    await new Promise(requestAnimationFrame);
    await vi.waitFor(() => {
      const hovered = document.querySelector(firstSelector);
      expect(hovered).not.toBeNull();
      expect(hovered?.hasAttribute("data-active")).toBe(false);
      expect(hovered?.getAttribute("aria-selected")).not.toBe("true");
      expect(
        document.querySelector('.bn-frimousse-emoji[aria-selected="true"]')?.id,
      ).toBe(editor.getAttribute("aria-activedescendant"));
      expect(document.activeElement).toBe(editor);
    });
  });
  test("should leave composing navigation keys to the editor", async () => {
    await focusOnEditor();
    const editor = await waitForSelector(EDITOR_SELECTOR);
    await openEmojiPicker();
    await userEvent.keyboard("frog");
    const selected = await waitForSelector(
      '.bn-frimousse-emoji[data-selected][aria-label="Frog"]',
    );
    const emoji = selected.textContent;

    // Synthetic composition flags exercise the bridge, not an OS IME's UI.
    editor.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    for (const key of [
      "ArrowRight",
      "ArrowDown",
      "ArrowLeft",
      "ArrowUp",
      "Enter",
    ]) {
      const event = new KeyboardEvent("keydown", {
        key,
        isComposing: true,
        bubbles: true,
        cancelable: true,
      });
      editor.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(false);
      await new Promise(requestAnimationFrame);
      expect(
        document.querySelector(".bn-frimousse-emoji[data-selected]")
          ?.textContent,
      ).toBe(emoji);
    }
    expect(editor.textContent).toContain(":frog");
    expect(document.activeElement).toBe(editor);
    editor.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true }),
    );
  });
  test.each(["an", "in"])(
    "should allow mouse scrolling and picking with query '%s'",
    async (query) => {
      await focusOnEditor();
      await openEmojiPicker();
      if (query) {
        await userEvent.keyboard(query);
      }
      const viewport = await waitForSelector("[frimousse-viewport]");
      await vi.waitFor(() => {
        expect(
          document
            .querySelector(EDITOR_SELECTOR)
            ?.getAttribute("aria-activedescendant"),
        ).toBeTruthy();
      });

      // Native scrolling, like a wheel/scrollbar, must not cause the DOM
      // observer to pull the unchanged keyboard selection back into view.
      async function scrollTo(top: number) {
        viewport.scrollTop = top;
        // Allow scroll events, virtualization, and its MutationObserver to run.
        for (let frame = 0; frame < 3; frame++) {
          await new Promise(requestAnimationFrame);
        }
        expect(viewport.scrollTop).toBe(top);
      }

      await scrollTo(96);
      await scrollTo(32);
      await scrollTo(800);

      for (const [top, key] of [
        [800, "ArrowDown"],
        [0, "ArrowUp"],
      ] as const) {
        if (top === 0) {
          await userEvent.keyboard("{ArrowDown}".repeat(12));
          await scrollTo(0);
        }
        await vi.waitFor(() => {
          expect(
            document
              .querySelector(EDITOR_SELECTOR)
              ?.getAttribute("aria-activedescendant"),
          ).toBeNull();
        });
        // Returning to keyboard navigation reveals the new selection, even
        // though the previously selected row has been virtualized away.
        await userEvent.keyboard(`{${key}}`);
        await vi.waitFor(() => {
          const selected = document.querySelector<HTMLElement>(
            ".bn-frimousse-emoji[data-selected]",
          );
          expect(selected).not.toBeNull();
          const rect = selected!.getBoundingClientRect();
          const viewportRect = viewport.getBoundingClientRect();
          expect(rect.top).toBeGreaterThanOrEqual(viewportRect.top);
          expect(rect.bottom).toBeLessThanOrEqual(viewportRect.bottom);
          expect(selected?.id).toBe(
            document
              .querySelector(EDITOR_SELECTOR)
              ?.getAttribute("aria-activedescendant"),
          );
        });
      }
      // Mouse scrolling remains free after keyboard navigation too.
      await scrollTo(800);

      const viewportRect = viewport.getBoundingClientRect();
      const button = Array.from(
        viewport.querySelectorAll<HTMLButtonElement>(".bn-frimousse-emoji"),
      ).find((button) => {
        const rect = button.getBoundingClientRect();
        return (
          rect.top >= viewportRect.top + 30 &&
          rect.bottom <= viewportRect.bottom
        );
      });
      if (!button?.textContent) {
        throw new Error("Expected a visible emoji after scrolling");
      }
      const emoji = button.textContent;
      await userEvent.click(button);
      await waitForTextInEditor(`${emoji} `);
    },
  );
  test("should scroll to a mounted emoji without estimating its position", async () => {
    await focusOnEditor();
    await userEvent.keyboard(":an");
    await waitForSelector(".bn-frimousse-emoji[data-selected]");
    const viewport = await waitForSelector("[frimousse-viewport]");
    viewport.scrollTop = 96;
    for (let frame = 0; frame < 3; frame++) {
      await new Promise(requestAnimationFrame);
    }
    expect(viewport.scrollTop).toBe(96);
    const button = await waitForSelector(
      '[aria-rowindex="0"] [aria-colindex="1"]',
    );
    const scrollTo = vi.spyOn(viewport, "scrollTo");
    const scrollIntoView = vi.spyOn(button, "scrollIntoView");
    try {
      await userEvent.keyboard("{ArrowRight}");
      await vi.waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "nearest",
          behavior: "instant",
        });
        expect(button.getAttribute("aria-selected")).toBe("true");
      });
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      scrollTo.mockRestore();
      scrollIntoView.mockRestore();
    }
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
    expect((await waitForSelectedEmoji()).textContent).toBe("🐸");
    await userEvent.keyboard("{Enter}");
    await waitForTextInEditor("🐸 ");
  });
});
