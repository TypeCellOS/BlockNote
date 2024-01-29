import { FC, useMemo } from "react";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { SuggestionMenuLabelProps } from "./SuggestionMenuLabel";
import { SuggestionMenuItemProps } from "./SuggestionMenuItem";
import { useLoadSuggestionMenuItems } from "./hooks/useLoadSuggestionMenuItems";
import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems";
import { useSuggestionMenuKeyboardNavigation } from "./hooks/useSuggestionMenuKeyboardNavigation";
import { useSuggestionMenu } from "../../hooks/useSuggestionMenu";
import {
  DefaultRenderItems,
  SuggestionMenuItemsProps,
} from "./DefaultRenderItems";
import { defaultGetItems } from "./defaultGetItems";

export function DefaultPositionedSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  triggerCharacter?: string;
  getItems?: (
    query: string
  ) => Promise<(SuggestionMenuItemProps | SuggestionMenuLabelProps)[]>;
  renderItems?: FC<SuggestionMenuItemsProps>;
}) {
  const { editor, triggerCharacter, getItems, renderItems } = props;

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
        renderItems={renderItems}
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
  S extends StyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  query: string;
  closeMenu: () => void;
  clearQuery: () => void;
  getItems?: (
    query: string
  ) => Promise<(SuggestionMenuItemProps | SuggestionMenuLabelProps)[]>;
  renderItems?: FC<SuggestionMenuItemsProps>;
}) {
  const { editor, query, closeMenu, clearQuery, getItems, renderItems } = props;

  const getItemsForLoading = useMemo(
    () => (query: string) =>
      getItems !== undefined ? getItems(query) : defaultGetItems(editor, query),
    [editor, getItems]
  );

  const { items, usedQuery, loadingState } = useLoadSuggestionMenuItems(
    query,
    getItemsForLoading
  );

  useCloseSuggestionMenuNoItems(items, usedQuery, closeMenu);

  const itemsWithMenuClose = useMemo(
    () =>
      items.map((item) =>
        !("label" in item)
          ? {
              ...item,
              executeItem: () => {
                console.log("cume");
                closeMenu();
                clearQuery();
                item.executeItem();
              },
            }
          : item
      ),
    [clearQuery, closeMenu, items]
  );

  const selectedIndex = useSuggestionMenuKeyboardNavigation(
    editor,
    itemsWithMenuClose.filter((item) => !("label" in item)),
    (item) => (item as SuggestionMenuItemProps).executeItem(),
    closeMenu
  );

  const SuggestionMenuItems = renderItems || DefaultRenderItems;

  return (
    <SuggestionMenuItems
      items={itemsWithMenuClose}
      loadingState={loadingState}
      selectedIndex={selectedIndex}
    />
  );
}
