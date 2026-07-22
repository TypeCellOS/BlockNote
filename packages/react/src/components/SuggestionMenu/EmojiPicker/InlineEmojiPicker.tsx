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

  // Ref-based counter that resets each render and increments as each
  // Emoji component renders, so we can match selectedIndex to position.
  const emojiCounterRef = useRef(0);
  // Mutable object to collect the selected emoji during render for the footer
  const selectedEmojiRef = useRef({ emoji: "", label: "" });

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

  // Scroll the selected emoji into view after render
  useEffect(() => {
    if (!rootRef.current) {
      return;
    }
    const selected = rootRef.current.querySelector<HTMLElement>(
      ".bn-frimousse-emoji[data-selected]",
    );
    selected?.scrollIntoView({ block: "nearest" });
  });

  useEffect(() => {
    const getEmojiCount = () => {
      if (!rootRef.current) {
        return 0;
      }
      return rootRef.current.querySelectorAll(".bn-frimousse-emoji").length;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const count = getEmojiCount();
      if (count === 0) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((i) => (i + 1) % count);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((i) => (i - 1 + count) % count);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((i) => Math.min(i + COLUMNS, count - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((i) => Math.max(i - COLUMNS, 0));
      } else if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        const buttons = rootRef.current?.querySelectorAll<HTMLButtonElement>(
          ".bn-frimousse-emoji",
        );
        buttons?.[selectedIndex]?.click();
      }
    };

    editorDOMElement?.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorDOMElement?.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editorDOMElement, selectedIndex]);

  // Reset the render counter before each render
  emojiCounterRef.current = 0;
  selectedEmojiRef.current = { emoji: "", label: "" };

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
            Emoji: ({ emoji, ...emojiProps }) => {
              const idx = emojiCounterRef.current++;
              const isSelected = idx === selectedIndex;
              if (isSelected) {
                selectedEmojiRef.current = {
                  emoji: emoji.emoji,
                  label: emoji.label,
                };
              }
              return (
                <button
                  className="bn-frimousse-emoji"
                  data-selected={isSelected ? "" : undefined}
                  {...emojiProps}
                >
                  {emoji.emoji}
                </button>
              );
            },
          }}
        />
      </EmojiPicker.Viewport>
      <div className="bn-frimousse-footer">
        {selectedEmojiRef.current.emoji ? (
          <div className="bn-frimousse-active-emoji">
            <span className="bn-frimousse-active-emoji-glyph">
              {selectedEmojiRef.current.emoji}
            </span>
            <span className="bn-frimousse-active-emoji-label">
              {selectedEmojiRef.current.label}
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
