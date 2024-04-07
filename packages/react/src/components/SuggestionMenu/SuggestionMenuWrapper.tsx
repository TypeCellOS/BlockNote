import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { FC, useCallback, useEffect } from "react";

import { useBlockNotePropsContext } from "../../editor/BlockNotePropsContext";
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
  const ctx = useBlockNotePropsContext()!;
  const setEditorProps = ctx.setProps;

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
    [onItemClick, closeMenu, clearQuery]
  );

  const { items, usedQuery, loadingState } = useLoadSuggestionMenuItems(
    query,
    getItems
  );

  useCloseSuggestionMenuNoItems(items, usedQuery, closeMenu);

  const { selectedIndex, setSelectedIndex } =
    useSuggestionMenuKeyboardNavigation(
      editor,
      items,
      closeMenu,
      onItemClickCloseMenu
    );

  useEffect(() => {
    setEditorProps((p) => ({
      ...p,
      "aria-expanded": true,
      "aria-controls": "bn-suggestion-box",
    }));
    return () => {
      setEditorProps((p) => ({
        ...p,
        "aria-expanded": false,
        "aria-controls": undefined,
      }));
    };
  }, [setEditorProps]);

  useEffect(() => {
    setEditorProps((p) => ({
      ...p,
      "aria-activedescendant":
        selectedIndex > -1 ? "bn-suggestion-item-" + selectedIndex : undefined,
    }));
    return () => {
      setEditorProps((p) => ({
        ...p,
        "aria-activedescendant": undefined,
      }));
    };
  }, [setEditorProps, selectedIndex]);

  // TODO: reset selectionIndex when items change?
  // TODO: changes to suggestionmenu need extensive testing

  const Component = suggestionMenuComponent;

  return (
    <Component
      items={items}
      onItemClick={onItemClickCloseMenu}
      loadingState={loadingState}
      selectedIndex={selectedIndex}
      setSelectedIndex={setSelectedIndex}
    />
  );
}
