import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useState } from "react";

// Hook which handles keyboard navigation of a suggestion menu. Up & down arrow
// keys are used to select a menu item, enter is used to execute it. Can also
// use the left & right arrow keys in addition to up & down to navigate a grid.
export function useSuggestionMenuKeyboardNavigation<Item>(
  editor: BlockNoteEditor<any, any, any>,
  query: string,
  items: Item[],
  grid = false,
  onItemClick?: (item: Item) => void
) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    const handleMenuNavigationKeys = (event: KeyboardEvent) => {
      if (grid) {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          if (items.length) {
            setSelectedIndex(
              (selectedIndex + 1 + items!.length) % items!.length
            );
          }
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          if (items.length) {
            setSelectedIndex(
              (selectedIndex - 1 + items!.length) % items!.length
            );
          }
        }
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex(
            (selectedIndex - (grid ? 10 : 1) + items!.length) % items!.length
          );
        }

        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex((selectedIndex + (grid ? 10 : 1)) % items!.length);
        }

        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();

        if (items.length) {
          onItemClick?.(items[selectedIndex]);
        }

        return true;
      }

      return false;
    };

    editor.domElement.addEventListener(
      "keydown",
      handleMenuNavigationKeys,
      true
    );

    return () => {
      editor.domElement.removeEventListener(
        "keydown",
        handleMenuNavigationKeys,
        true
      );
    };
  }, [editor.domElement, items, selectedIndex, onItemClick, grid]);

  // Resets index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return {
    selectedIndex: items.length === 0 ? undefined : selectedIndex,
  };
}
