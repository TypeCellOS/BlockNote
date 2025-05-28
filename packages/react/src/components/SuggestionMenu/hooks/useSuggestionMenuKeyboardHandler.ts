import React, { useState } from "react";

// Hook which returns a handler for keyboard navigation of a suggestion menu. Up
// & down arrow keys are used to select an item, enter is used to execute it.
export function useSuggestionMenuKeyboardHandler<Item>(
  items: Item[],
  onItemClick?: (item: Item) => void,
  isMenuVisible?: boolean | undefined 
) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  return {
    selectedIndex,
    setSelectedIndex,
    handler: (event: KeyboardEvent | React.KeyboardEvent) => {
      if (isMenuVisible === false) {
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
        
        if (!items.length || selectedIndex < 0 || selectedIndex >= items.length) {
          return false;
        }
        
        const suggestionMenuElement = document.querySelector('#bn-suggestion-menu, .bn-suggestion-menu, #ai-suggestion-menu');
        const isMenuInDOM = !!suggestionMenuElement;
        
        if (!isMenuVisible || !isMenuInDOM) {
          return false;
        }
        
        event.preventDefault();
        event.stopPropagation();

        if (onItemClick) {
          onItemClick(items[selectedIndex]);
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
