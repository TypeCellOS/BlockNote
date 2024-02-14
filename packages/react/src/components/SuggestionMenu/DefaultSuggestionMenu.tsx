import { FC, useMemo } from "react";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionMenuState,
  UiElementPosition,
} from "@blocknote/core";
import { useLoadSuggestionMenuItems } from "./hooks/useLoadSuggestionMenuItems";
import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems";
import { useSuggestionMenuKeyboardNavigation } from "./hooks/useSuggestionMenuKeyboardNavigation";
import { defaultGetItems } from "./defaultGetItems";
import {
  MantineSuggestionMenu,
  SuggestionMenuComponentProps,
} from "./MantineDefaults/MantineSuggestionMenu";
import { SuggestionMenuItemProps } from "./MantineDefaults/MantineSuggestionMenuItem";

export type SuggestionMenuProps<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  Item
> = {
  editor: BlockNoteEditor<BSchema, I, S>;
  getItems?: (
    query: string,
    closeMenu: () => void,
    clearQuery: () => void
  ) => Promise<Item[]>;
  suggestionMenuComponent?: FC<SuggestionMenuComponentProps<Item>>;
} & Omit<SuggestionMenuState, keyof UiElementPosition> &
  Pick<
    BlockNoteEditor<any, any, any>["suggestionMenus"],
    "closeMenu" | "clearQuery"
  >;

export function DefaultSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  Item extends {
    name: string;
    execute: () => void;
  } = SuggestionMenuItemProps
>(props: SuggestionMenuProps<BSchema, I, S, Item>) {
  const {
    editor,
    getItems,
    suggestionMenuComponent,
    query,
    closeMenu,
    clearQuery,
  } = props;

  const getItemsForLoading = useMemo<(query: string) => Promise<Item[]>>(
    () => (query: string) =>
      getItems !== undefined
        ? getItems(query, closeMenu, clearQuery)
        : (defaultGetItems(editor, query, closeMenu, clearQuery) as Promise<
            Item[]
          >),
    [clearQuery, closeMenu, editor, getItems]
  );

  const { items, usedQuery, loadingState } = useLoadSuggestionMenuItems<Item>(
    query,
    getItemsForLoading
  );

  useCloseSuggestionMenuNoItems(items, usedQuery, closeMenu);

  const selectedIndex = useSuggestionMenuKeyboardNavigation(
    editor,
    items,
    closeMenu
  );

  const SuggestionMenuComponent: FC<SuggestionMenuComponentProps<Item>> =
    suggestionMenuComponent || MantineSuggestionMenu;

  return (
    <SuggestionMenuComponent
      items={items}
      loadingState={loadingState}
      selectedIndex={selectedIndex}
    />
  );
}
