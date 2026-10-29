import { type FrimousseEmojiData } from "@blocknote/core/emoji-data";
import {
  EmojiPicker,
  type EmojiDataResolver,
  type EmojiPickerListEmojiProps,
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
import { resolveBlockNoteEmojiData } from "../../../util/emojiPickerData.js";
import { ActiveEmojiDisplay } from "../../Comments/FrimoussePicker.js";
import { getSuggestionMenuItemId } from "../getSuggestionMenuItemId.js";
import {
  EMOJI_PICKER_COLUMNS,
  filterEmojiData,
  getEmojiPickerRows,
  moveEmojiPosition,
  type EmojiPosition,
} from "./emojiPickerModel.js";

const SelectedEmojiContext = createContext<string | undefined>(undefined);
const INITIAL_POSITION: EmojiPosition = { row: 0, column: 0 };

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

type ResolvedEmojiData = {
  locale: string;
  data: FrimousseEmojiData;
};

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

function InlineEmojiPickerContent(props: {
  query: string;
  insertEmoji: (emoji: string) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
  data: FrimousseEmojiData | undefined;
}) {
  const { query, insertEmoji, rootRef, data } = props;
  const editorDOMElement = useEditorDOMElement();
  const setContentEditableProps =
    useBlockNoteContext()!.setContentEditableProps!;
  const dict = useDictionary();
  const [skinTone] = useSkinTone();

  const rows = useMemo(() => (data ? getEmojiPickerRows(data) : []), [data]);
  const [selection, setSelection] = useState({
    query,
    position: INITIAL_POSITION,
  });
  if (selection.query !== query) {
    setSelection({ query, position: INITIAL_POSITION });
  }
  const selectedPosition =
    selection.query === query ? selection.position : INITIAL_POSITION;

  const selectedRow = rows[selectedPosition.row];
  const selectedEmoji = selectedRow?.emojis[selectedPosition.column];
  const selectedChar =
    selectedEmoji &&
    (skinTone === "none"
      ? selectedEmoji.emoji
      : (selectedEmoji.skins?.[skinTone] ?? selectedEmoji.emoji));
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

  // Frimousse publishes its imperative Root ref after child layout effects.
  // Wait until passive effects to synchronize the mounted button and observe
  // asynchronous loading/virtualization.
  useEffect(() => {
    function setActiveDescendant(id: string | undefined) {
      setContentEditableProps((props) =>
        props?.["aria-activedescendant"] === id
          ? props
          : { ...props, "aria-activedescendant": id },
      );
    }

    const root = rootRef.current;
    if (!root || !selectedChar || !selectedRow) {
      setActiveDescendant(undefined);
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
        setActiveDescendant(undefined);
        return;
      }

      if (scrollPending) {
        scrollPending = false;
        btn.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
      markButtonSelected(pickerRoot, btn, selectedIndexValue);
      setActiveDescendant(btn.id);
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
    return () => {
      observer.disconnect();
      setActiveDescendant(undefined);
    };
  }, [
    rootRef,
    selectedChar,
    selectedIndex,
    selectedPosition,
    selectedRow,
    setContentEditableProps,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
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
        setSelection({ query, position: nextPosition });
      } else if (event.key === "Enter" && selectedChar) {
        event.preventDefault();
        event.stopPropagation();
        // Frimousse schedules filtering asynchronously. Only insert once its
        // rendered grid has caught up with the keyboard model's selection.
        const root = rootRef.current;
        if (
          root &&
          findButtonAtPosition(root, selectedPosition, selectedChar)
        ) {
          insertEmoji(selectedChar);
        }
      }
    };

    editorDOMElement?.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorDOMElement?.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    rows,
    editorDOMElement,
    insertEmoji,
    query,
    rootRef,
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
        {!data && (
          <EmojiPicker.Loading className="bn-frimousse-loading">
            {dict.emoji_picker.loading}
          </EmojiPicker.Loading>
        )}
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
  const rootRef = useRef<HTMLDivElement>(null);

  // Only the keyboard model filters here; Frimousse filters the full corpus
  // through its controlled Search without remounting or resolving data again.
  const data = useMemo(
    () =>
      resolvedData?.locale === locale
        ? filterEmojiData(resolvedData.data, props.query)
        : undefined,
    [resolvedData, locale, props.query],
  );
  const [resolveEmojiData] = useState(() => {
    const resolver: EmojiDataResolver = async (resolvedLocale, options) => {
      const resolved = await resolveBlockNoteEmojiData(resolvedLocale, options);
      if (!options.signal?.aborted) {
        setResolvedData({ locale: resolvedLocale, data: resolved });
      }
      return resolved;
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
      key={locale}
      ref={rootRef}
      id="bn-suggestion-menu"
      className="bn-frimousse-picker"
      locale={locale}
      columns={EMOJI_PICKER_COLUMNS}
      resolveEmojiData={resolveEmojiData}
      onEmojiSelect={({ emoji }) => insertEmoji(emoji)}
    >
      <InlineEmojiPickerContent
        query={props.query}
        insertEmoji={insertEmoji}
        rootRef={rootRef}
        data={data}
      />
    </EmojiPicker.Root>
  );
}
