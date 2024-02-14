import { FC, useMemo } from "react";
import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
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
  MantineSuggestionMenuProps,
} from "./MantineDefaults/MantineSuggestionMenu";
import { MantineSuggestionMenuItemProps } from "./MantineDefaults/MantineSuggestionMenuItem";

export type SuggestionMenuProps<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
  Item extends {
    name: string;
    execute: () => void;
  } = MantineSuggestionMenuItemProps
> = {
  editor: BlockNoteEditor<BSchema, I, S>;
  getItems?: (
    query: string,
    closeMenu: () => void,
    clearQuery: () => void
  ) => Promise<Item[]>;
  suggestionMenuComponent?: FC<MantineSuggestionMenuProps<Item>>;
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
  }
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

  const SuggestionMenuComponent: FC<MantineSuggestionMenuProps<Item>> =
    suggestionMenuComponent || MantineSuggestionMenu;

  return (
    <SuggestionMenuComponent
      items={items}
      loadingState={loadingState}
      selectedIndex={selectedIndex}
    />
  );
}
