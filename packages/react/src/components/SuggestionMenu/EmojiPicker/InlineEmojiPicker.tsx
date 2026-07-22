import type { EmojiI18n } from "@blocknote/emoji-data";
import { EmojiPicker } from "frimousse";
import { useEffect, useRef, useState } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorDOMElement } from "../../../hooks/useEditorDomElement.js";
import { useDictionary } from "../../../i18n/dictionary.js";

function useEmojiI18n(locale: string): EmojiI18n | undefined {
  const [i18n, setI18n] = useState<EmojiI18n | undefined>(undefined);

  useEffect(() => {
    void import("@blocknote/emoji-data").then(({ loadEmojiLocale }) =>
      loadEmojiLocale(locale).then(setI18n),
    );
  }, [locale]);

  return i18n;
}

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
  const rowCount = Number(grid.getAttribute("aria-rowcount") ?? 0);
  if (rowCount === 0) {
    return 0;
  }
  // Last row may have fewer items. Read it from aria-colcount or estimate.
  // Total = (rowCount - 1) * COLUMNS + lastRowSize, but we don't know
  // lastRowSize cheaply. Use rowCount * COLUMNS as upper bound — clamping
  // in navigation handles the overshoot.
  return rowCount * COLUMNS;
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

  const [resolvedLocale, setResolvedLocale] = useState<string | undefined>(
    undefined,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState({ emoji: "", label: "" });

  useEffect(() => {
    void import("@blocknote/emoji-data").then(({ seedFrimousseCache }) =>
      seedFrimousseCache(locale).then((seededLocale) => {
        setResolvedLocale(seededLocale);
      }),
    );
  }, [locale]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.query]);

  // After selectedIndex changes, scroll the viewport so the target row
  // is visible, wait for Frimousse to render it, then read the button.
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

    // Estimate scroll position accounting for category headers.
    // Frimousse's total height = rows * rowHeight + categories * headerHeight.
    // We approximate the category count as roughly 1 per 20-30 rows.
    // A simpler heuristic: each row is rowHeight, plus some slack for headers.
    const estimatedY = targetRow * rowHeight;
    const viewportHeight = viewport.clientHeight;

    // Only scroll if the target row is outside the visible range
    if (
      estimatedY < viewport.scrollTop ||
      estimatedY + rowHeight >
        viewport.scrollTop + viewportHeight - headerHeight
    ) {
      viewport.scrollTop = Math.max(0, estimatedY - viewportHeight / 3);
    }

    const applySelection = () => {
      if (!rootRef.current) {
        return;
      }
      // Clear previous selection
      for (const el of rootRef.current.querySelectorAll("[data-selected]")) {
        el.removeAttribute("data-selected");
      }

      const buttons = rootRef.current.querySelectorAll<HTMLButtonElement>(
        ".bn-frimousse-emoji",
      );
      // Map selectedIndex (absolute) to local index within rendered buttons.
      const firstRow =
        rootRef.current.querySelector<HTMLElement>("[aria-rowindex]");
      const firstRowIndex = Number(
        firstRow?.getAttribute("aria-rowindex") ?? 0,
      );
      const localIndex = selectedIndex - firstRowIndex * COLUMNS;

      const btn = buttons[localIndex];
      if (btn) {
        btn.setAttribute("data-selected", "");
        btn.scrollIntoView({ block: "nearest" });
        setSelectedEmoji({
          emoji: btn.textContent ?? "",
          label: btn.getAttribute("aria-label") ?? "",
        });
      }
    };

    // Try immediately, then retry after a frame (for virtualization catch-up)
    applySelection();
    const frameId = requestAnimationFrame(applySelection);

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
        // Find the button at selectedIndex among rendered buttons
        const firstRow = root.querySelector<HTMLElement>("[aria-rowindex]");
        const firstRowIndex = Number(
          firstRow?.getAttribute("aria-rowindex") ?? 0,
        );
        const localIndex = selectedIndex - firstRowIndex * COLUMNS;
        const buttons = root.querySelectorAll<HTMLButtonElement>(
          ".bn-frimousse-emoji",
        );
        buttons[localIndex]?.click();
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
              <button className="bn-frimousse-emoji" {...emojiProps}>
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
      <div className="bn-frimousse-footer">
        {selectedEmoji.emoji ? (
          <div className="bn-frimousse-active-emoji">
            <span className="bn-frimousse-active-emoji-glyph">
              {selectedEmoji.emoji}
            </span>
            <span className="bn-frimousse-active-emoji-label">
              {selectedEmoji.label}
            </span>
          </div>
        ) : (
          <div className="bn-frimousse-active-emoji">
            <span className="bn-frimousse-active-emoji-label bn-frimousse-active-emoji-placeholder">
              {i18n?.search ?? "Search"}…
            </span>
          </div>
        )}
        <EmojiPicker.SkinToneSelector className="bn-frimousse-skin-tone" />
      </div>
    </EmojiPicker.Root>
  );
}
