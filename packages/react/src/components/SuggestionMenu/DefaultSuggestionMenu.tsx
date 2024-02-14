import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC, useCallback } from "react";

import { useSuggestionMenu } from "../../hooks/useSuggestionMenu";
import { DefaultSuggestionItem } from "./DefaultSuggestionItem";
import {
  MantineSuggestionMenu,
  SuggestionMenuProps,
} from "./MantineSuggestionMenu";
import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems";
import { useLoadSuggestionMenuItems } from "./hooks/useLoadSuggestionMenuItems";
import { useSuggestionMenuKeyboardNavigation } from "./hooks/useSuggestionMenuKeyboardNavigation";

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

type ItemType<GetItemsType extends (query: string) => Promise<any[]>> =
  ArrayElement<Awaited<ReturnType<GetItemsType>>>;

export function DefaultPositionedSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  // This is a bit hacky, but only way I found to make types work so the optionality
  // of suggestionMenuComponent depends on the return type of getItems
  GetItemsType extends (query: string) => Promise<any[]>
>(
  props: {
    editor: BlockNoteEditor<BSchema, I, S>;
    triggerCharacter?: string;
    getItems: GetItemsType;
    onItemClick?: (item: ItemType<GetItemsType>) => void;
  } & (ArrayElement<
    Awaited<ReturnType<GetItemsType>>
  > extends DefaultSuggestionItem
    ? {
        // can be undefined
        suggestionMenuComponent?: FC<
          SuggestionMenuProps<ItemType<GetItemsType>>
        >;
      }
    : {
        // getItems doesn't return DefaultSuggestionItem, so suggestionMenuComponent is required
        suggestionMenuComponent: FC<
          SuggestionMenuProps<ItemType<GetItemsType>>
        >;
      })
) {
  const {
    editor,
    triggerCharacter,
    onItemClick,
    getItems,
    suggestionMenuComponent,
  } = props;

  const { isMounted, suggestionMenuProps, positionerProps } = useSuggestionMenu(
    editor,
    triggerCharacter || "/"
  );

  const clickHandler = useCallback(
    (item: ItemType<GetItemsType>) => {
      suggestionMenuProps.closeMenu();
      suggestionMenuProps.clearQuery();
      onItemClick?.(item);
    },
    [onItemClick, suggestionMenuProps]
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div ref={positionerProps.ref} style={positionerProps.styles}>
      <DefaultSuggestionMenu
        suggestionMenuComponent={
          suggestionMenuComponent || MantineSuggestionMenu
        }
        editor={editor}
        getItems={getItems}
        onItemClick={clickHandler}
        query={suggestionMenuProps.query}
        closeMenu={suggestionMenuProps.closeMenu}
        clearQuery={suggestionMenuProps.clearQuery}
      />
    </div>
  );
}

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
    query,
    closeMenu,
    getItems,
    onItemClick,
    suggestionMenuComponent,
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
