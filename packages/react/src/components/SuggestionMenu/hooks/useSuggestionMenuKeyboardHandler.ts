import React, { useState } from "react";

// Hook which returns a handler for keyboard navigation of a suggestion menu. Up
// & down arrow keys are used to select an item, enter is used to execute it.
export function useSuggestionMenuKeyboardHandler<Item>(
  items: Item[],
  onItemClick?: (item: Item) => void,
) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  return {
    selectedIndex,
    setSelectedIndex,
    handler: (event: KeyboardEvent | React.KeyboardEvent) => {
      const nativeEvent = "nativeEvent" in event ? event.nativeEvent : event;
      // This handler also runs in DOM capture listeners, before ProseMirror's
      // composition guard. Leave candidate navigation and confirmation to the IME.
      // Some IMEs report the confirming key as 229 with isComposing already false.
      if (nativeEvent.isComposing || nativeEvent.keyCode === 229) {
        return false;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex((selectedIndex - 1 + items!.length) % items!.length);
        }

        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex((selectedIndex + 1) % items!.length);
        }

        return true;
      }

      if (event.key === "PageUp") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex(0);
        }

        return true;
      }

      if (event.key === "PageDown") {
        event.preventDefault();

        if (items.length) {
          setSelectedIndex(items.length - 1);
        }

        return true;
      }

      if (event.key === "Enter") {
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
