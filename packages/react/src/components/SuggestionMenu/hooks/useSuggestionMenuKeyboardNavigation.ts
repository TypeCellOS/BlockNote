import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useState } from "react";
import { SuggestionMenuItemProps } from "../MantineSuggestionMenuItem";

// Hook which handles keyboard navigation of a suggestion menu. Arrow keys are
// used to select a menu item, enter to execute it, and escape to close the
// menu.
export function useSuggestionMenuKeyboardNavigation<
  Item extends {
    name: string;
    execute: () => void;
  } = SuggestionMenuItemProps
>(
  editor: BlockNoteEditor<any, any, any>,
  items: Item[],
  closeMenu: () => void
) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    const handleMenuNavigationKeys = (event: KeyboardEvent) => {
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

      if (event.key === "Enter") {
        event.preventDefault();

        if (items.length) {
          items[selectedIndex].execute();
        }

        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        closeMenu();

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
  }, [closeMenu, editor.domElement, items, selectedIndex]);

  return selectedIndex;
}
