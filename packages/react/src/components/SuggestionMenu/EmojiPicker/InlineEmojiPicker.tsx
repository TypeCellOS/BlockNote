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
  useMemo,
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

type ResolvedEmojiData = {
  locale: string;
  data: FrimousseEmojiData;
};

type EmojiPosition = {
  row: number;
  column: number;
};

function getEmojiPickerRows(data: FrimousseEmojiData): EmojiPickerRow[] {
  const emojisByCategory = new Map<number, FrimousseEmoji[]>();

  for (const emoji of data.emojis) {
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

function filterEmojiData(data: FrimousseEmojiData, query: string) {
  return {
    ...data,
    emojis: searchEmojis(data.emojis, query, data.locale),
  };
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
  insertEmoji: (emoji: string) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
  data: FrimousseEmojiData | undefined;
  onSkinToneChange: (skinTone: SkinTone) => void;
}) {
  const { insertEmoji, rootRef, data, onSkinToneChange } = props;
  const editorDOMElement = useEditorDOMElement();
  const setContentEditableProps =
    useBlockNoteContext()!.setContentEditableProps!;
  const dict = useDictionary();
  const [skinTone] = useSkinTone();

  const rows = useMemo(() => (data ? getEmojiPickerRows(data) : []), [data]);
  const [selectedPosition, setSelectedPosition] = useState<EmojiPosition>({
    row: 0,
    column: 0,
  });
  const [selectedButtonVisible, setSelectedButtonVisible] = useState(false);

  useEffect(() => {
    onSkinToneChange(skinTone);
  }, [onSkinToneChange, skinTone]);

  const selectedRow = rows[selectedPosition.row];
  const selectedEmoji = selectedRow?.emojis[selectedPosition.column];
  const selectedChar = selectedEmoji && emojiGlyph(selectedEmoji, skinTone);
  const selectedIndex =
    rows
      .slice(0, selectedPosition.row)
      .reduce((count, row) => count + row.emojis.length, 0) +
    selectedPosition.column;

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
        selectedButtonVisible && selectedEmoji
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

  // Frimousse publishes its imperative Root ref after child layout effects.
  // Wait until passive effects to synchronize the mounted button and observe
  // asynchronous loading/virtualization, including on a keyed Root's first render.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    if (!selectedChar || !selectedRow) {
      // eslint-disable-next-line react/set-state-in-effect -- Visibility is synchronized with the virtualized DOM, not derived from emoji data alone.
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
    if (!findButtonAtPosition(root, selectedPosition, selectedChar)) {
      scrollViewportTo(root, selectedPosition, selectedRow.categoryIndex);
    }
    updateSelectedButton();
    return () => observer.disconnect();
  }, [rootRef, selectedChar, selectedIndex, selectedPosition, selectedRow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }

      if (event.key.startsWith("Arrow") && rows.length === 0) {
        return;
      }

      const key = event.key;
      if (
        key === "ArrowRight" ||
        key === "ArrowLeft" ||
        key === "ArrowDown" ||
        key === "ArrowUp"
      ) {
        const nextPosition = moveEmojiPosition(selectedPosition, key, rows);
        if (nextPosition === selectedPosition) {
          return;
        }
        event.preventDefault();
        setSelectedPosition(nextPosition);
      } else if (event.key === "Enter" && selectedChar) {
        event.preventDefault();
        event.stopPropagation();
        insertEmoji(selectedChar);
      }
    };

    editorDOMElement?.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorDOMElement?.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [rows, editorDOMElement, insertEmoji, selectedChar, selectedPosition]);

  const placeholder = `${dict.emoji_picker.search}…`;

  return (
    <>
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
  const [resolvedData, setResolvedData] = useState<ResolvedEmojiData>();
  const [skinTone, setSkinTone] = useState<SkinTone>("none");
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the resolved corpus above the keyed Root so typing only filters it;
  // it must not decode data or repeat platform-support detection per keystroke.
  const data = useMemo(
    () =>
      resolvedData?.locale === locale
        ? filterEmojiData(resolvedData.data, props.query)
        : undefined,
    [resolvedData, locale, props.query],
  );
  const resolveEmojiData = useMemo<EmojiDataResolver>(
    () => async (resolvedLocale, options) => {
      if (data) {
        return data;
      }
      const resolved = await resolveBlockNoteEmojiData(resolvedLocale, options);
      if (!options.signal?.aborted) {
        setResolvedData({ locale: resolvedLocale, data: resolved });
      }
      return filterEmojiData(resolved, props.query);
    },
    [data, props.query],
  );

  function insertEmoji(emoji: string) {
    props.clearQuery();
    props.closeMenu();
    editor.insertInlineContent(emoji + " ");
  }

  return (
    <EmojiPicker.Root
      // Frimousse reloads resolver data only on mount/locale changes. Keep its
      // search empty and remount on query changes so the virtualized list and
      // editor navigation consume exactly the same prefiltered results.
      key={`${locale}:${props.query}`}
      ref={rootRef}
      id="bn-suggestion-menu"
      className="bn-frimousse-picker"
      locale={locale}
      columns={COLUMNS}
      skinTone={skinTone}
      resolveEmojiData={resolveEmojiData}
      onEmojiSelect={({ emoji }) => insertEmoji(emoji)}
    >
      <InlineEmojiPickerContent
        insertEmoji={insertEmoji}
        rootRef={rootRef}
        data={data}
        onSkinToneChange={setSkinTone}
      />
    </EmojiPicker.Root>
  );
}
