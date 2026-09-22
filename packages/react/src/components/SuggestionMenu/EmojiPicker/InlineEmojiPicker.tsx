import {
  searchEmojis,
  type FrimousseEmoji,
  type FrimousseEmojiData,
} from "@blocknote/core/emoji-data";
import { EmojiPicker, type EmojiDataResolver } from "frimousse";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useBlockNoteContext } from "../../../editor/BlockNoteContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorDOMElement } from "../../../hooks/useEditorDomElement.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import {
  ActiveEmojiDisplay,
  resolveBlockNoteEmojiData,
  useEmojiI18n,
} from "../../Comments/FrimoussePicker.js";
import { getSuggestionMenuItemId } from "../getSuggestionMenuItemId.js";

const COLUMNS = 9;
const blockNoteEmojiDataResolver: EmojiDataResolver = resolveBlockNoteEmojiData;

type EmojiPickerRow = {
  categoryIndex: number;
  emojis: FrimousseEmoji[];
};

type EmojiPickerResults = {
  locale: string;
  query: string;
  rows: EmojiPickerRow[];
};

type ResolvedEmojiData = {
  locale: string;
  data: FrimousseEmojiData;
};

type EmojiPosition = {
  row: number;
  column: number;
};

function getEmojiPickerRows(
  data: FrimousseEmojiData,
  query: string,
): EmojiPickerRow[] {
  const emojisByCategory = new Map<number, FrimousseEmoji[]>();

  for (const emoji of searchEmojis(data.emojis, query)) {
    const categoryEmojis = emojisByCategory.get(emoji.category);
    if (categoryEmojis) {
      categoryEmojis.push(emoji);
    } else {
      emojisByCategory.set(emoji.category, [emoji]);
    }
  }

  const rows: EmojiPickerRow[] = [];
  let categoryIndex = 0;
  for (const category of data.categories) {
    const categoryEmojis = emojisByCategory.get(category.index);
    if (!categoryEmojis) {
      continue;
    }

    for (let index = 0; index < categoryEmojis.length; index += COLUMNS) {
      rows.push({
        categoryIndex,
        emojis: categoryEmojis.slice(index, index + COLUMNS),
      });
    }
    categoryIndex += 1;
  }

  return rows;
}

function moveEmojiPosition(
  position: EmojiPosition,
  key: "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp",
  rows: EmojiPickerRow[],
): EmojiPosition {
  const row = rows[position.row];
  if (!row) {
    return { row: 0, column: 0 };
  }

  switch (key) {
    case "ArrowLeft": {
      if (position.column > 0) {
        return { ...position, column: position.column - 1 };
      }
      const previousRow = rows[position.row - 1];
      return previousRow
        ? { row: position.row - 1, column: previousRow.emojis.length - 1 }
        : position;
    }
    case "ArrowRight": {
      if (position.column < row.emojis.length - 1) {
        return { ...position, column: position.column + 1 };
      }
      return rows[position.row + 1]
        ? { row: position.row + 1, column: 0 }
        : position;
    }
    case "ArrowUp": {
      const previousRow = rows[position.row - 1];
      return previousRow
        ? {
            row: position.row - 1,
            column: Math.min(position.column, previousRow.emojis.length - 1),
          }
        : position;
    }
    case "ArrowDown": {
      const nextRow = rows[position.row + 1];
      return nextRow
        ? {
            row: position.row + 1,
            column: Math.min(position.column, nextRow.emojis.length - 1),
          }
        : position;
    }
  }
}

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

function findButtonAtPosition(
  root: HTMLElement,
  position: EmojiPosition,
  emoji: string,
): HTMLButtonElement | null {
  const row = root.querySelector<HTMLElement>(
    `[aria-rowindex="${position.row}"]`,
  );
  const button = row?.querySelectorAll<HTMLButtonElement>(
    ".bn-frimousse-emoji",
  )[position.column];
  return button?.textContent === emoji ? button : null;
}

function markButtonSelected(
  root: HTMLElement,
  button: HTMLButtonElement,
  selectedIndex: number,
) {
  root
    .querySelectorAll<HTMLElement>("[id^='bn-suggestion-menu-item-']")
    .forEach((element) => element.removeAttribute("id"));
  button.id = getSuggestionMenuItemId(selectedIndex)!;
}

function scrollViewportTo(
  root: HTMLElement,
  position: EmojiPosition,
  categoryIndex: number,
) {
  const viewport = root.querySelector<HTMLElement>("[frimousse-viewport]");
  if (!viewport) {
    return;
  }

  const rowHeight = getRowHeight(root);
  const headerHeight = getCategoryHeaderHeight(root);
  const estimatedY =
    position.row * rowHeight + (categoryIndex + 1) * headerHeight;
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
  const setContentEditableProps =
    useBlockNoteContext()!.setContentEditableProps!;
  const dict = useDictionary();
  const locale = dict.locale ?? "en";
  const i18n = useEmojiI18n(locale);
  const rootRef = useRef<HTMLDivElement>(null);

  const [resolvedData, setResolvedData] = useState<ResolvedEmojiData>();
  const [results, setResults] = useState<EmojiPickerResults>();
  const [selectedPosition, setSelectedPosition] = useState<EmojiPosition>({
    row: 0,
    column: 0,
  });
  const [selectedButtonVisible, setSelectedButtonVisible] = useState(false);

  useEffect(() => {
    setSelectedPosition({ row: 0, column: 0 });
    setSelectedButtonVisible(false);
  }, [query, locale]);

  const [resolveEmojiData] = useState(() => {
    const resolver: EmojiDataResolver = async (resolvedLocale, options) => {
      const data = await blockNoteEmojiDataResolver(resolvedLocale, options);
      if (!options.signal?.aborted) {
        setResolvedData({ locale: resolvedLocale, data });
      }
      return data;
    };
    return resolver;
  });

  useEffect(() => {
    if (resolvedData?.locale === locale) {
      setResults({
        locale,
        query,
        rows: getEmojiPickerRows(resolvedData.data, query),
      });
    }
  }, [locale, query, resolvedData]);

  const currentResults =
    results?.locale === locale && results.query === query ? results : undefined;
  const selectedRow = currentResults?.rows[selectedPosition.row];
  const selectedEmoji = selectedRow?.emojis[selectedPosition.column];
  const selectedIndex = currentResults
    ? currentResults.rows
        .slice(0, selectedPosition.row)
        .reduce((count, row) => count + row.emojis.length, 0) +
      selectedPosition.column
    : undefined;

  useEffect(() => {
    setContentEditableProps((props) => ({
      ...props,
      "aria-expanded": true,
      "aria-controls": "bn-suggestion-menu",
    }));
    return () => {
      setContentEditableProps((props) => ({
        ...props,
        "aria-expanded": false,
        "aria-controls": undefined,
      }));
    };
  }, [setContentEditableProps]);

  useEffect(() => {
    setContentEditableProps((props) => ({
      ...props,
      "aria-activedescendant":
        selectedButtonVisible && selectedEmoji && selectedIndex !== undefined
          ? getSuggestionMenuItemId(selectedIndex)
          : undefined,
    }));
    return () => {
      setContentEditableProps((props) => ({
        ...props,
        "aria-activedescendant": undefined,
      }));
    };
  }, [
    selectedButtonVisible,
    selectedEmoji,
    selectedIndex,
    setContentEditableProps,
  ]);

  // Attach the typed selection to its rendered button before paint when the
  // virtualized row is already present.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    if (!selectedEmoji || !selectedRow || selectedIndex === undefined) {
      setSelectedButtonVisible(false);
      return;
    }
    // Scroll first so frimousse can virtualise the target row.
    scrollViewportTo(root, selectedPosition, selectedRow.categoryIndex);

    const btn = findButtonAtPosition(
      root,
      selectedPosition,
      selectedEmoji.emoji,
    );
    if (btn) {
      btn.scrollIntoView({ block: "nearest" });
      markButtonSelected(root, btn, selectedIndex);
      setSelectedButtonVisible(true);
    } else {
      setSelectedButtonVisible(false);
    }
  }, [selectedEmoji, selectedIndex, selectedPosition, selectedRow]);

  // Frimousse loads and virtualizes rows asynchronously. Observe those DOM
  // changes instead of polling every animation frame while no row is present.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const pickerRoot: HTMLDivElement = root;

    if (!selectedEmoji || !selectedRow || selectedIndex === undefined) {
      setSelectedButtonVisible(false);
      return;
    }
    const selectedEmojiValue = selectedEmoji;
    const selectedIndexValue = selectedIndex;

    // Ensure viewport is scrolled to the target area.
    scrollViewportTo(pickerRoot, selectedPosition, selectedRow.categoryIndex);

    function updateSelectedButton() {
      const btn = findButtonAtPosition(
        pickerRoot,
        selectedPosition,
        selectedEmojiValue.emoji,
      );
      if (!btn) {
        setSelectedButtonVisible(false);
        return false;
      }

      btn.scrollIntoView({ block: "nearest" });
      markButtonSelected(pickerRoot, btn, selectedIndexValue);
      setSelectedButtonVisible(true);
      return true;
    }

    const observer = new MutationObserver(() => {
      updateSelectedButton();
    });

    observer.observe(pickerRoot, {
      attributeFilter: ["aria-label"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    updateSelectedButton();
    return () => observer.disconnect();
  }, [selectedEmoji, selectedIndex, selectedPosition, selectedRow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentResults) {
        return;
      }

      if (event.key.startsWith("Arrow") && currentResults.rows.length === 0) {
        return;
      }

      const key = event.key;
      if (
        key === "ArrowRight" ||
        key === "ArrowLeft" ||
        key === "ArrowDown" ||
        key === "ArrowUp"
      ) {
        event.preventDefault();
        setSelectedPosition((position) =>
          moveEmojiPosition(position, key, currentResults.rows),
        );
      } else if (event.key === "Enter" && !event.isComposing) {
        if (selectedEmoji) {
          event.preventDefault();
          event.stopPropagation();
          clearQuery();
          closeMenu();
          editor.insertInlineContent(selectedEmoji.emoji + " ");
        }
      }
    };

    editorDOMElement?.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorDOMElement?.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    clearQuery,
    closeMenu,
    currentResults,
    editor,
    editorDOMElement,
    selectedEmoji,
  ]);

  const placeholder = `${i18n?.search ?? "Search"}…`;
  const selectedChar = selectedEmoji?.emoji;

  return (
    <EmojiPicker.Root
      ref={rootRef}
      id="bn-suggestion-menu"
      className="bn-frimousse-picker"
      locale={locale}
      columns={COLUMNS}
      resolveEmojiData={resolveEmojiData}
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
                type="button"
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
          emoji={selectedEmoji?.emoji}
          label={selectedEmoji?.label}
          placeholder={placeholder}
        />
        <EmojiPicker.SkinToneSelector className="bn-frimousse-skin-tone" />
      </div>
    </EmojiPicker.Root>
  );
}
