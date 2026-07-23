import { EmojiPicker } from "frimousse";
import { useEffect, useRef, useState } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorDOMElement } from "../../../hooks/useEditorDomElement.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import {
  ActiveEmojiDisplay,
  useEmojiI18n,
  useResolvedLocale,
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

export function InlineEmojiPicker(props: {
  query: string;
  closeMenu: () => void;
  clearQuery: () => void;
}) {
  const editor = useBlockNoteEditor();
  const editorDOMElement = useEditorDOMElement(editor);
  const dict = useDictionary();
  const locale = dict.locale ?? "en";
  const i18n = useEmojiI18n(locale);
  const rootRef = useRef<HTMLDivElement>(null);

  const resolvedLocale = useResolvedLocale(locale);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState({ emoji: "", label: "" });

  // The selected emoji character — read during render by the Emoji component
  // to apply data-selected. Using a ref so Frimousse's memoized re-renders
  // always read the latest value without needing a state-triggered re-render.
  const selectedCharRef = useRef("");

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.query]);

  // Scroll viewport and resolve selected emoji character when index changes
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
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
      estimatedY + rowHeight >
        viewport.scrollTop + viewportHeight - headerHeight
    ) {
      viewport.scrollTop = Math.max(0, estimatedY - viewportHeight / 3);
    }

    const resolve = () => {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      const btn = findButtonAtIndex(root, selectedIndex);
      if (btn) {
        const char = btn.textContent ?? "";
        selectedCharRef.current = char;
        btn.scrollIntoView({ block: "nearest" });
        setSelectedEmoji({
          emoji: char,
          label: btn.getAttribute("aria-label") ?? "",
        });
      }
    };

    resolve();
    const frameId = requestAnimationFrame(resolve);
    return () => cancelAnimationFrame(frameId);
  }, [selectedIndex, props.query, resolvedLocale]);

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
            props.clearQuery();
            props.closeMenu();
            editor.insertInlineContent(char + " ");
          }
        }
      }
    };

    editorDOMElement?.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorDOMElement?.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editorDOMElement, selectedIndex]);

  if (!resolvedLocale) {
    return (
      <div className="bn-frimousse-picker">
        <div className="bn-frimousse-loading">Loading…</div>
      </div>
    );
  }

  const frimousseLocale = resolvedLocale as any;
  const placeholder = `${i18n?.search ?? "Search"}…`;

  return (
    <EmojiPicker.Root
      ref={rootRef}
      className="bn-frimousse-picker"
      locale={frimousseLocale}
      columns={COLUMNS}
      onEmojiSelect={(emoji) => {
        props.clearQuery();
        props.closeMenu();
        editor.insertInlineContent(emoji.emoji + " ");
      }}
    >
      <EmojiPicker.Search
        className="bn-frimousse-search-hidden"
        value={props.query}
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
                data-selected={
                  emoji.emoji === selectedCharRef.current ? "" : undefined
                }
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
