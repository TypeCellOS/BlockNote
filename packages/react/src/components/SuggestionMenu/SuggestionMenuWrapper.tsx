import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { FC, useCallback, useContext, useEffect } from "react";

import { useBlockNoteContext } from "../../editor/BlockNoteContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { GenericPopoverContext } from "../Popovers/GenericPopover.js";
import { useCloseSuggestionMenuNoItems } from "./hooks/useCloseSuggestionMenuNoItems.js";
import { useLoadSuggestionMenuItems } from "./hooks/useLoadSuggestionMenuItems.js";
import { useSuggestionMenuKeyboardNavigation } from "./hooks/useSuggestionMenuKeyboardNavigation.js";
import { SuggestionMenuProps } from "./types.js";

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

  const {
    getItems,
    suggestionMenuComponent,
    query,
    clearQuery,
    closeMenu,
    onItemClick,
  } = props;

  const onItemClickCloseMenu = useCallback(
    (item: Item) => {
      closeMenu();
      clearQuery();
      onItemClick?.(item);
    },
    [onItemClick, closeMenu, clearQuery],
  );

  const { items, usedQuery, loadingState } = useLoadSuggestionMenuItems(
    query,
    getItems,
  );

  // If this component is used inside a `GenericPopover`, the position of the
  // popover should be recalculated once all the items are fetched. This is
  // because it may need to resize/shift/flip if the height of the suggestion 
  // menu with all items is too tall and overflows.
  const update = useContext(GenericPopoverContext)?.useFloatingReturn.update;
  useEffect(() => {
    update?.();
  }, [loadingState, update]);

  useCloseSuggestionMenuNoItems(items, usedQuery, closeMenu);

  const { selectedIndex } = useSuggestionMenuKeyboardNavigation(
    editor,
    query,
    items,
    onItemClickCloseMenu,
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
      onItemClick={onItemClickCloseMenu}
      loadingState={loadingState}
      selectedIndex={selectedIndex}
    />
  );
}
