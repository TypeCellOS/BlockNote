import { FC, useCallback } from "react";

import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems";
import { useLoadSuggestionMenuItems } from "./hooks/useLoadSuggestionMenuItems";
import { useSuggestionMenuKeyboardNavigation } from "./hooks/useSuggestionMenuKeyboardNavigation";
import { SuggestionMenuProps } from "./types";
import { useBlockNoteEditor } from "../../editor/BlockNoteContext";
import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";

export function DefaultSuggestionMenu<Item>(props: {
  query: string;
  closeMenu: () => void;
  clearQuery: () => void;
  getItems: (query: string) => Promise<Item[]>;
  onItemClick?: (item: Item) => void;
  suggestionMenuComponent: FC<SuggestionMenuProps<Item>>;
}) {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const {
    getItems,
    suggestionMenuComponent,
    query,
    clearQuery,
    closeMenu,
    onItemClick,
  } = props;

  const clickHandler = useCallback(
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

  const selectedIndex = useSuggestionMenuKeyboardNavigation(
    editor,
    items,
    closeMenu,
    onItemClick
  );

  const Comp = suggestionMenuComponent;
  return (
    <Comp
      items={items}
      onItemClick={clickHandler}
      loadingState={loadingState}
      selectedIndex={selectedIndex}
    />
  );
}
