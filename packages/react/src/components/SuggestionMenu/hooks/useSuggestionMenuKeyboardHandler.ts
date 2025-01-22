import React, { useState } from "react";

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
    handler: (event: KeyboardEvent | React.KeyboardEvent) => {
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

      const isComposing = isReactEvent(event)
        ? event.nativeEvent.isComposing
        : event.isComposing;
      if (event.key === "Enter" && !isComposing) {
        event.preventDefault();
        event.stopPropagation();

        if (items.length) {
          onItemClick?.(items[selectedIndex]);
        }

        return true;
      }

      return false;
    },
  };
}

function isReactEvent(
  event: KeyboardEvent | React.KeyboardEvent
): event is React.KeyboardEvent {
  return (event as React.KeyboardEvent).nativeEvent !== undefined;
}
