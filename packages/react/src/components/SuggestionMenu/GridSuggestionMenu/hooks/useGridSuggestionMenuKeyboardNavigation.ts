import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useState } from "react";

// Hook which handles keyboard navigation of a grid suggestion menu. Arrow keys
// are used to select a menu item, enter is used to execute it.
export function useGridSuggestionMenuKeyboardNavigation<Item>(
  editor: BlockNoteEditor<any, any, any>,
  query: string,
  items: Item[],
  columns: number,
  onItemClick?: (item: Item) => void,
) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const isGrid = columns !== undefined && columns > 1;

  useEffect(() => {
    const handleMenuNavigationKeys = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (items.length) {
          setSelectedIndex((selectedIndex - 1 + items!.length) % items!.length);
        }
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (items.length) {
          setSelectedIndex((selectedIndex + 1 + items!.length) % items!.length);
        }
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex(
            (selectedIndex - columns + items!.length) % items!.length,
          );
        }

        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex((selectedIndex + columns) % items!.length);
        }

        return true;
      }

      if (event.key === "Enter" && !event.isComposing) {
        event.stopPropagation();
        event.preventDefault();

        if (items.length) {
          onItemClick?.(items[selectedIndex]);
        }

        return true;
      }

      return false;
    };

    editor.domElement?.addEventListener(
      "keydown",
      handleMenuNavigationKeys,
      true,
    );

    return () => {
      editor.domElement?.removeEventListener(
        "keydown",
        handleMenuNavigationKeys,
        true,
      );
    };
  }, [editor.domElement, items, selectedIndex, onItemClick, columns, isGrid]);

  // Resets index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return {
    selectedIndex: items.length === 0 ? undefined : selectedIndex,
  };
}
