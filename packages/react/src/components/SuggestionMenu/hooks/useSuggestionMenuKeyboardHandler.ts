import { useState } from "react";

// Hook which returns a handler for keyboard navigation of a suggestion menu. Up
// & down arrow keys are used to select an item, enter is used to execute it.
export function useSuggestionMenuKeyboardHandler<Item>(
  items: Item[],
  onItemClick?: (item: Item) => void
) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  return {
    selectedIndex,
    setSelectedIndex,
    handler: (event: {
      key: string;
      preventDefault: () => void;
      isComposing: boolean;
    }) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex((selectedIndex - 1 + items!.length) % items!.length);
        }

        return true;
      }

      if (event.key === "ArrowDown") {
        // debugger;
        event.preventDefault();

        if (items.length) {
          setSelectedIndex((selectedIndex + 1) % items!.length);
        }

        return true;
      }

      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();

        if (items.length) {
          onItemClick?.(items[selectedIndex]);
        }

        return true;
      }

      return false;
    },
  };
}
