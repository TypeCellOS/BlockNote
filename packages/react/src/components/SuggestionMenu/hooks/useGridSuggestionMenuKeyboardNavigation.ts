import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useState } from "react";

// Hook which handles keyboard navigation of a suggestion menu. Arrow keys are
// used to select a menu item, enter to execute it. This version uses the left
// & right arrow keys in addition to up & down to navigate a grid.
export function useGridSuggestionMenuKeyboardNavigation<Item>(
  editor: BlockNoteEditor<any, any, any>,
  query: string,
  items: Item[],
  onItemClick?: ((item: Item) => void) | ((item: never) => void)
) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    const handleMenuNavigationKeys = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex(selectedIndex - 10 >= 0 ? selectedIndex - 10 : 0);
        }

        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex(
            selectedIndex + 10 < items!.length
              ? selectedIndex + 10
              : items!.length - 1
          );
        }

        return true;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (items.length) {
          setSelectedIndex((selectedIndex + 1 + items!.length) % items!.length);
        }
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (items.length) {
          setSelectedIndex((selectedIndex - 1 + items!.length) % items!.length);
        }
      }

      if (event.key === "Enter") {
        event.preventDefault();

        if (items.length) {
          onItemClick?.(items[selectedIndex] as never);
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
  }, [editor.domElement, items, selectedIndex, onItemClick]);

  // Resets index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return {
    selectedIndex: items.length === 0 ? undefined : selectedIndex,
  };
}
