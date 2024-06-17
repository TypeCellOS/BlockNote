import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { FC, useCallback, useEffect } from "react";

import { useBlockNoteContext } from "../../editor/BlockNoteContext";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems";
import { useLoadSuggestionMenuItems } from "./hooks/useLoadSuggestionMenuItems";
import { useSuggestionMenuKeyboardNavigation } from "./hooks/useSuggestionMenuKeyboardNavigation";
import { SuggestionMenuProps } from "./types";

export function SuggestionMenuWrapper<Item>(props: {
  query: string;
  closeMenu: () => void;
  clearQuery: () => void;
  getItems: (query: string) => Promise<Item[]>;
  onItemClick?: (item: Item) => void;
  suggestionMenuComponent: FC<SuggestionMenuProps<Item>>;
}) {
  const ctx = useBlockNoteContext();
  const setContentEditableProps = ctx!.setContentEditableProps!;
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const emojiInsert = (emojiToInsert) => {
      clearQuery()
      editor.insertInlineContent([
          {
            type: "emoji",
            props: {
              emoji : emojiToInsert
            },
          },
          " ", // add a space after the emoji
        ]);
  }

  const {
    getItems,
    suggestionMenuComponent,
    query,
    clearQuery,
    closeMenu,
    onItemClick,
    isEmoji
  } = props;

  const onItemClickCloseMenu = useCallback(
    (item: Item) => {
      closeMenu();
      clearQuery();
      onItemClick?.(item);
    },
    [onItemClick, closeMenu, clearQuery]
  );

  const { items, usedQuery, loadingState } = useLoadSuggestionMenuItems(
    query,
    getItems
  );

  useCloseSuggestionMenuNoItems(items, usedQuery, closeMenu);

  const { selectedIndex } = useSuggestionMenuKeyboardNavigation(
    editor,
    query,
    items,
    isEmoji ? emojiInsert : onItemClickCloseMenu,
    isEmoji
  );

  // set basic aria attributes when the menu is open
  useEffect(() => {
    setContentEditableProps((p) => ({
      ...p,
      "aria-expanded": true,
      "aria-controls": "bn-suggestion-menu",
    }));
    return () => {
      setContentEditableProps((p) => ({
        ...p,
        "aria-expanded": false,
        "aria-controls": undefined,
      }));
    };
  }, [setContentEditableProps]);

  // set selected item (activedescendent) attributes when selected item changes
  useEffect(() => {
    setContentEditableProps((p) => ({
      ...p,
      "aria-activedescendant": selectedIndex
        ? "bn-suggestion-menu-item-" + selectedIndex
        : undefined,
    }));
    return () => {
      setContentEditableProps((p) => ({
        ...p,
        "aria-activedescendant": undefined,
      }));
    };
  }, [setContentEditableProps, selectedIndex]);

  const Component = suggestionMenuComponent;

  return (
    <Component
      items={items}
      editor={editor}
      emojiInsert={emojiInsert}
      onItemClick={onItemClickCloseMenu}
      loadingState={loadingState}
      clearQuery={clearQuery}
      selectedIndex={selectedIndex}
    />
  );
}
