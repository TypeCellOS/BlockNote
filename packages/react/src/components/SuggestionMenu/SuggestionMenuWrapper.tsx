import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { FC, useCallback, useEffect, useState } from "react";

import { useBlockNoteContext } from "../../editor/BlockNoteContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
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
  const [isComposing, setIsComposing] = useState(false);

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

  useCloseSuggestionMenuNoItems(items, usedQuery, closeMenu, 3, isComposing);

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

  useEffect(() => {
    let previousCompositionStart:
      | ((event: CompositionEvent) => void)
      | undefined;
    let previousCompositionEnd: ((event: CompositionEvent) => void) | undefined;

    const handleCompositionStart = (event: CompositionEvent) => {
      previousCompositionStart?.(event);
      setIsComposing(true);
    };
    const handleCompositionEnd = (event: CompositionEvent) => {
      previousCompositionEnd?.(event);
      setIsComposing(false);
    };

    setContentEditableProps((p = {}) => {
      previousCompositionStart = p.onCompositionStart;
      previousCompositionEnd = p.onCompositionEnd;

      return {
        ...p,
        onCompositionStart: handleCompositionStart,
        onCompositionEnd: handleCompositionEnd,
      };
    });

    return () => {
      setContentEditableProps((p = {}) => {
        const next = { ...p };

        if (next.onCompositionStart === handleCompositionStart) {
          if (previousCompositionStart) {
            next.onCompositionStart = previousCompositionStart;
          } else {
            delete next.onCompositionStart;
          }
        }

        if (next.onCompositionEnd === handleCompositionEnd) {
          if (previousCompositionEnd) {
            next.onCompositionEnd = previousCompositionEnd;
          } else {
            delete next.onCompositionEnd;
          }
        }

        return next;
      });
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
