import {
  searchEmojis,
  type FrimousseEmoji,
  type FrimousseEmojiData,
} from "@blocknote/core/emoji-data";
import {
  EmojiPicker,
  type EmojiDataResolver,
  type EmojiPickerListEmojiProps,
  type SkinTone,
  useSkinTone,
} from "frimousse";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useBlockNoteContext } from "../../../editor/BlockNoteContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorDOMElement } from "../../../hooks/useEditorDomElement.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import {
  ActiveEmojiDisplay,
  resolveBlockNoteEmojiData,
} from "../../Comments/FrimoussePicker.js";
import { getSuggestionMenuItemId } from "../getSuggestionMenuItemId.js";

const COLUMNS = 9;
const SelectedEmojiContext = createContext<string | undefined>(undefined);

function InlineEmojiPickerEmoji({
  emoji,
  ...props
}: EmojiPickerListEmojiProps) {
  const selectedChar = useContext(SelectedEmojiContext);
  const selected = emoji.emoji === selectedChar;

  return (
    <button
      type="button"
      className="bn-frimousse-emoji"
      {...props}
      data-selected={selected ? "" : undefined}
      // Editor navigation owns selection; Frimousse still handles pointer/clicks.
      data-active={undefined}
      aria-selected={selected || undefined}
    >
      {emoji.emoji}
    </button>
  );
}

const inlineEmojiPickerComponents = {
  Emoji: InlineEmojiPickerEmoji,
};

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

  for (const emoji of searchEmojis(data.emojis, query, data.locale)) {
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
    return position;
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
    case "ArrowUp":
    case "ArrowDown": {
      const rowIndex = position.row + (key === "ArrowUp" ? -1 : 1);
      const nextRow = rows[rowIndex];
      return nextRow
        ? {
            row: rowIndex,
            column: Math.min(position.column, nextRow.emojis.length - 1),
          }
        : position;
    }
  }
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

  const style = getComputedStyle(root);
  const rowHeight =
    Number.parseFloat(style.getPropertyValue("--frimousse-row-height")) || 32;
  const headerHeight =
    Number.parseFloat(
      style.getPropertyValue("--frimousse-category-header-height"),
    ) || 30;
  const estimatedY =
    position.row * rowHeight + (categoryIndex + 1) * headerHeight;
  const viewportHeight = viewport.clientHeight;

  if (
    estimatedY < viewport.scrollTop ||
    estimatedY + rowHeight > viewport.scrollTop + viewportHeight - headerHeight
  ) {
    viewport.scrollTo({
      top: Math.max(0, estimatedY - viewportHeight / 3),
      behavior: "instant",
    });
  }
}

function emojiGlyph(
  emoji: Pick<FrimousseEmoji, "emoji" | "skins">,
  skinTone: SkinTone,
): string {
  return skinTone === "none"
    ? emoji.emoji
    : (emoji.skins?.[skinTone] ?? emoji.emoji);
}

function InlineEmojiPickerContent(props: {
  query: string;
  insertEmoji: (emoji: string) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
  resolvedData?: ResolvedEmojiData;
}) {
  const { query, insertEmoji, rootRef, resolvedData } = props;
  const editorDOMElement = useEditorDOMElement();
  const setContentEditableProps =
    useBlockNoteContext()!.setContentEditableProps!;
  const dict = useDictionary();
  const locale = dict.locale ?? "en";
  const [skinTone] = useSkinTone();

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
  const selectedChar = selectedEmoji && emojiGlyph(selectedEmoji, skinTone);
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

    if (!selectedChar || !selectedRow || selectedIndex === undefined) {
      setSelectedButtonVisible(false);
      return;
    }
    const btn = findButtonAtPosition(root, selectedPosition, selectedChar);
    if (btn) {
      btn.scrollIntoView({ block: "nearest", behavior: "instant" });
      markButtonSelected(root, btn, selectedIndex);
      setSelectedButtonVisible(true);
    } else {
      // Virtualized-away rows have no DOM node (or ID) to scroll to. Bring
      // the estimated row into range; the observer handles its exact button.
      scrollViewportTo(root, selectedPosition, selectedRow.categoryIndex);
      setSelectedButtonVisible(false);
    }
  }, [rootRef, selectedChar, selectedIndex, selectedPosition, selectedRow]);

  // Frimousse loads and virtualizes rows asynchronously. Observe those DOM
  // changes instead of polling every animation frame while no row is present.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    if (!selectedChar || !selectedRow || selectedIndex === undefined) {
      setSelectedButtonVisible(false);
      return;
    }

    // Scroll only once per selection change. Subsequent virtualization updates
    // must keep accessibility in sync without undoing manual mouse scrolling.
    let scrollPending = true;
    const pickerRoot = root;
    const selectedCharValue = selectedChar;
    const selectedIndexValue = selectedIndex;

    function updateSelectedButton() {
      const btn = findButtonAtPosition(
        pickerRoot,
        selectedPosition,
        selectedCharValue,
      );
      if (!btn) {
        setSelectedButtonVisible(false);
        return;
      }

      if (scrollPending) {
        scrollPending = false;
        btn.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
      markButtonSelected(pickerRoot, btn, selectedIndexValue);
      setSelectedButtonVisible(true);
    }

    const observer = new MutationObserver(updateSelectedButton);

    observer.observe(root, {
      attributeFilter: ["aria-label"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    updateSelectedButton();
    return () => observer.disconnect();
  }, [rootRef, selectedChar, selectedIndex, selectedPosition, selectedRow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || !currentResults) {
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
        const nextPosition = moveEmojiPosition(
          selectedPosition,
          key,
          currentResults.rows,
        );
        if (nextPosition === selectedPosition) {
          return;
        }
        event.preventDefault();
        setSelectedPosition(nextPosition);
      } else if (event.key === "Enter" && query.trim() && selectedChar) {
        event.preventDefault();
        event.stopPropagation();
        insertEmoji(selectedChar);
      }
    };

    editorDOMElement?.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorDOMElement?.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    currentResults,
    editorDOMElement,
    insertEmoji,
    query,
    selectedChar,
    selectedPosition,
  ]);

  const placeholder = `${dict.emoji_picker.search}…`;

  return (
    <>
      <EmojiPicker.Search
        className="bn-frimousse-search-hidden"
        value={query}
        readOnly
        tabIndex={-1}
      />
      <EmojiPicker.Viewport>
        <EmojiPicker.Loading className="bn-frimousse-loading">
          {dict.emoji_picker.loading}
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="bn-frimousse-empty">
          {dict.emoji_picker.search_no_results}
        </EmojiPicker.Empty>
        <SelectedEmojiContext.Provider value={selectedChar}>
          <EmojiPicker.List components={inlineEmojiPickerComponents} />
        </SelectedEmojiContext.Provider>
      </EmojiPicker.Viewport>
      <div className="bn-frimousse-footer">
        <ActiveEmojiDisplay
          emoji={selectedChar}
          label={selectedEmoji?.label}
          placeholder={placeholder}
        />
        <EmojiPicker.SkinToneSelector className="bn-frimousse-skin-tone" />
      </div>
    </>
  );
}

export function InlineEmojiPicker(props: {
  query: string;
  closeMenu: () => void;
  clearQuery: () => void;
}) {
  const editor = useBlockNoteEditor();
  const locale = useDictionary().locale ?? "en";
  const rootRef = useRef<HTMLDivElement>(null);
  const [resolvedData, setResolvedData] = useState<ResolvedEmojiData>();
  const [resolveEmojiData] = useState(() => {
    const resolver: EmojiDataResolver = async (resolvedLocale, options) => {
      const data = await resolveBlockNoteEmojiData(resolvedLocale, options);
      if (!options.signal?.aborted) {
        setResolvedData({ locale: resolvedLocale, data });
      }
      return data;
    };
    return resolver;
  });

  function insertEmoji(emoji: string) {
    props.clearQuery();
    props.closeMenu();
    editor.insertInlineContent(emoji + " ");
  }

  return (
    <EmojiPicker.Root
      ref={rootRef}
      id="bn-suggestion-menu"
      className="bn-frimousse-picker"
      locale={locale}
      columns={COLUMNS}
      resolveEmojiData={resolveEmojiData}
      onEmojiSelect={({ emoji }) => insertEmoji(emoji)}
    >
      <InlineEmojiPickerContent
        query={props.query}
        insertEmoji={insertEmoji}
        rootRef={rootRef}
        resolvedData={resolvedData}
      />
    </EmojiPicker.Root>
  );
}
