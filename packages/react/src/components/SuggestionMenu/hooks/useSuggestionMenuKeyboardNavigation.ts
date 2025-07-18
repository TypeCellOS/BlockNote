import { BlockNoteEditor } from "@blocknote/core";
import { useEffect } from "react";
import { useSuggestionMenuKeyboardHandler } from "./useSuggestionMenuKeyboardHandler.js";

// Hook which handles keyboard navigation of a suggestion menu. Up & down arrow
// keys are used to select a menu item, enter is used to execute it.
export function useSuggestionMenuKeyboardNavigation<Item>(
  editor: BlockNoteEditor<any, any, any>,
  query: string,
  items: Item[],
  onItemClick?: (item: Item) => void,
  isMenuVisible?: boolean,
) {
  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, onItemClick, isMenuVisible);

  useEffect(() => {
    editor.domElement?.addEventListener("keydown", handler, true);

    return () => {
      editor.domElement?.removeEventListener(
        "keydown",
        handler,
        true,
      );
    };
  }, [editor.domElement, items, selectedIndex, onItemClick, handler]);

  // Resets index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, setSelectedIndex]);

  return {
    selectedIndex: items.length === 0 ? undefined : selectedIndex,
  };
}
