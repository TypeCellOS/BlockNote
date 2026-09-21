import { EmojiPicker } from "frimousse";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorDOMElement } from "../../../hooks/useEditorDomElement.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import {
  ActiveEmojiDisplay,
  resolveBlockNoteEmojiData,
  useEmojiI18n,
} from "../../Comments/FrimoussePicker.js";

const COLUMNS = 9;

function getRowHeight(root: HTMLElement): number {
  return (
    Number.parseFloat(
      getComputedStyle(root).getPropertyValue("--frimousse-row-height"),
    ) || 32
  );
}

function getCategoryHeaderHeight(root: HTMLElement): number {
  return (
    Number.parseFloat(
      getComputedStyle(root).getPropertyValue(
        "--frimousse-category-header-height",
      ),
    ) || 30
  );
}

function getTotalEmojiCount(root: HTMLElement): number {
  const grid = root.querySelector<HTMLElement>("[role='grid']");
  if (!grid) {
    return 0;
  }
  return Number(grid.getAttribute("aria-rowcount") ?? 0) * COLUMNS;
}

function findButtonAtIndex(
  root: HTMLElement,
  absIndex: number,
): HTMLButtonElement | null {
  const firstRow = root.querySelector<HTMLElement>("[aria-rowindex]");
  const firstRowIndex = Number(firstRow?.getAttribute("aria-rowindex") ?? 0);
  const localIndex = absIndex - firstRowIndex * COLUMNS;
  const buttons = Array.from(
    root.querySelectorAll<HTMLButtonElement>(".bn-frimousse-emoji"),
  ).filter((btn) => !btn.closest("[aria-hidden]"));
  return buttons[localIndex] ?? null;
}

function scrollViewportTo(root: HTMLElement, selectedIndex: number) {
  const viewport = root.querySelector<HTMLElement>("[frimousse-viewport]");
  if (!viewport) {
    return;
  }

  const rowHeight = getRowHeight(root);
  const headerHeight = getCategoryHeaderHeight(root);
  const targetRow = Math.floor(selectedIndex / COLUMNS);
  const estimatedY = targetRow * rowHeight;
  const viewportHeight = viewport.clientHeight;

  if (
    estimatedY < viewport.scrollTop ||
    estimatedY + rowHeight > viewport.scrollTop + viewportHeight - headerHeight
  ) {
    viewport.scrollTop = Math.max(0, estimatedY - viewportHeight / 3);
  }
}

export function InlineEmojiPicker(props: {
  query: string;
  closeMenu: () => void;
  clearQuery: () => void;
}) {
  const { query, closeMenu, clearQuery } = props;
  const editor = useBlockNoteEditor();
  const editorDOMElement = useEditorDOMElement(editor);
  const dict = useDictionary();
  const locale = dict.locale ?? "en";
  const i18n = useEmojiI18n(locale);
  const rootRef = useRef<HTMLDivElement>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState({ emoji: "", label: "" });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, locale]);

  // Resolve the emoji character at selectedIndex. When the button is already
  // in the DOM (common case: arrow keys within the visible viewport), the
  // layout effect finds it immediately. The state change triggers a
  // synchronous re-render before paint, so the Emoji component applies
  // data-selected without a visible flash.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    // Scroll first so frimousse can virtualise the target row.
    scrollViewportTo(root, selectedIndex);

    const btn = findButtonAtIndex(root, selectedIndex);
    if (btn) {
      btn.scrollIntoView({ block: "nearest" });
      const emoji = btn.textContent ?? "";
      const label = btn.getAttribute("aria-label") ?? "";
      setSelectedEmoji((prev) => {
        if (prev.emoji === emoji && prev.label === label) {
          return prev;
        }
        return { emoji, label };
      });
    }
  }, [selectedIndex, query, locale]);

  // Fallback for when the target button isn't in the DOM during the layout
  // effect — either because frimousse is still loading emoji data on first
  // mount, because a search query is being processed via requestIdleCallback,
  // or because the viewport scroll from the layout effect triggered
  // virtualisation and the new rows haven't rendered yet.
  // Polls with requestAnimationFrame until the button appears.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const btn = findButtonAtIndex(root, selectedIndex);
    if (btn) {
      // Button already handled by the layout effect.
      return;
    }

    // Ensure viewport is scrolled to the target area.
    scrollViewportTo(root, selectedIndex);

    let cancelled = false;
    let frameId = 0;

    const poll = () => {
      if (cancelled) {
        return;
      }
      const btn = findButtonAtIndex(root, selectedIndex);
      if (btn) {
        btn.scrollIntoView({ block: "nearest" });
        setSelectedEmoji({
          emoji: btn.textContent ?? "",
          label: btn.getAttribute("aria-label") ?? "",
        });
        return;
      }
      frameId = requestAnimationFrame(poll);
    };

    frameId = requestAnimationFrame(poll);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [selectedIndex, query, locale]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) {
        return;
      }

      const count = getTotalEmojiCount(root);
      if (count === 0) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, count - 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + COLUMNS, count - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - COLUMNS, 0));
      } else if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        const btn = findButtonAtIndex(root, selectedIndex);
        if (btn) {
          const char = btn.textContent ?? "";
          if (char) {
            clearQuery();
            closeMenu();
            editor.insertInlineContent(char + " ");
          }
        }
      }
    };

    editorDOMElement?.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorDOMElement?.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [clearQuery, closeMenu, editor, editorDOMElement, selectedIndex]);

  const placeholder = `${i18n?.search ?? "Search"}…`;
  const selectedChar = selectedEmoji.emoji;

  return (
    <EmojiPicker.Root
      ref={rootRef}
      className="bn-frimousse-picker"
      locale={locale}
      columns={COLUMNS}
      resolveEmojiData={resolveBlockNoteEmojiData}
      onEmojiSelect={(emoji) => {
        clearQuery();
        closeMenu();
        editor.insertInlineContent(emoji.emoji + " ");
      }}
    >
      <EmojiPicker.Search
        className="bn-frimousse-search-hidden"
        value={query}
        readOnly
        tabIndex={-1}
      />
      <EmojiPicker.Viewport>
        <EmojiPicker.Loading className="bn-frimousse-loading">
          Loading…
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="bn-frimousse-empty">
          {i18n?.searchNoResults ?? "No emoji found."}
        </EmojiPicker.Empty>
        <EmojiPicker.List
          components={{
            CategoryHeader: ({ category, ...headerProps }) => (
              <div className="bn-frimousse-category-header" {...headerProps}>
                {category.label}
              </div>
            ),
            Row: ({ children, ...rowProps }) => (
              <div className="bn-frimousse-row" {...rowProps}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...emojiProps }) => (
              <button
                className="bn-frimousse-emoji"
                data-selected={emoji.emoji === selectedChar ? "" : undefined}
                {...emojiProps}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
      <div className="bn-frimousse-footer">
        <ActiveEmojiDisplay
          emoji={selectedEmoji.emoji || undefined}
          label={selectedEmoji.label}
          placeholder={placeholder}
        />
        <EmojiPicker.SkinToneSelector className="bn-frimousse-skin-tone" />
      </div>
    </EmojiPicker.Root>
  );
}
