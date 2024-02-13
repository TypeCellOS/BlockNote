import { FC, useMemo } from "react";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { SuggestionMenuItemProps } from "./MantineSuggestionMenuItem";
import { useLoadSuggestionMenuItems } from "./hooks/useLoadSuggestionMenuItems";
import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems";
import { useSuggestionMenuKeyboardNavigation } from "./hooks/useSuggestionMenuKeyboardNavigation";
import { useSuggestionMenu } from "../../hooks/useSuggestionMenu";
import { defaultGetItems } from "./defaultGetItems";
import {
  MantineSuggestionMenu,
  SuggestionMenuProps,
} from "./MantineSuggestionMenu";

export function DefaultPositionedSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  Item extends {
    name: string;
    execute: () => void;
  } = SuggestionMenuItemProps
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  triggerCharacter?: string;
  getItems?: (
    query: string,
    closeMenu: () => void,
    clearQuery: () => void
  ) => Promise<Item[]>;
  suggestionMenuComponent?: FC<SuggestionMenuProps<Item>>;
}) {
  const { editor, triggerCharacter, getItems, suggestionMenuComponent } = props;

  const { isMounted, suggestionMenuProps, positionerProps } = useSuggestionMenu(
    editor,
    triggerCharacter || "/"
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div ref={positionerProps.ref} style={positionerProps.styles}>
      <DefaultSuggestionMenu
        editor={editor}
        {...suggestionMenuProps}
        getItems={getItems}
        suggestionMenuComponent={suggestionMenuComponent}
      />
    </div>
  );
}

// TODO: The reason these 2 components are split is because the hooks in
//  `DefaultSuggestionMenu` assume that the menu is open. Therefore, they should
//  only be run when the menu is open (you cannot conditionally run hooks).
//  We could add a `show` param to each hook, but I feel like that is less
//  "React-ish" than splitting the components. I think that it might be an issue
//  that the menu plugins currently send both position and state data in the
//  same update, as we can't separate `useSuggestionMenu` into 2 hooks, one for
//  state and one for position.
// TODO: Make renderItems accept any item type if getItems also returns an
//  arbitrary data type.
export function DefaultSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  Item extends {
    name: string;
    execute: () => void;
  } = SuggestionMenuItemProps
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  query: string;
  closeMenu: () => void;
  clearQuery: () => void;
  getItems?: (
    query: string,
    closeMenu: () => void,
    clearQuery: () => void
  ) => Promise<Item[]>;
  suggestionMenuComponent?: FC<SuggestionMenuProps<Item>>;
}) {
  const {
    editor,
    query,
    closeMenu,
    clearQuery,
    getItems,
    suggestionMenuComponent,
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

  const SuggestionMenu: FC<SuggestionMenuProps<Item>> =
    suggestionMenuComponent || MantineSuggestionMenu;

  return (
    <SuggestionMenu
      items={items}
      loadingState={loadingState}
      selectedIndex={selectedIndex}
    />
  );
}
