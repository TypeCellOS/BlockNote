import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC } from "react";

import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems";
import { useLoadSuggestionMenuItems } from "./hooks/useLoadSuggestionMenuItems";
import { useSuggestionMenuKeyboardNavigation } from "./hooks/useSuggestionMenuKeyboardNavigation";
import { SuggestionMenuProps } from "./types";

export function DefaultSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  Item
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  query: string;
  closeMenu: () => void;
  clearQuery: () => void;
  getItems: (query: string) => Promise<Item[]>;
  onItemClick?: (item: Item) => void;
  suggestionMenuComponent: FC<SuggestionMenuProps<Item>>;
}) {
  const {
    editor,
    getItems,
    suggestionMenuComponent,
    query,
    closeMenu,
    onItemClick,
  } = props;

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
      onItemClick={onItemClick}
      loadingState={loadingState}
      selectedIndex={selectedIndex}
    />
  );
}
