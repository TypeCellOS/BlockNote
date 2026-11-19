import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useState } from "react";
import { useEditorDOMElement } from "../../../hooks/useEditorDomElement.js";
import { useSuggestionMenuKeyboardHandler } from "./useSuggestionMenuKeyboardHandler.js";

// Hook which handles keyboard navigation of a suggestion menu. Up & down arrow
// keys are used to select a menu item, enter is used to execute it.
export function useSuggestionMenuKeyboardNavigation<Item>(
  _editor: BlockNoteEditor<any, any, any>,
  query: string,
  items: Item[],
  onItemClick?: (item: Item) => void,
  element?: HTMLElement,
) {
  const editorDOMElement = useEditorDOMElement();
  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, onItemClick);

  useEffect(() => {
    const el = element || editorDOMElement;
    el?.addEventListener("keydown", handler, true);

    return () => {
      el?.removeEventListener("keydown", handler, true);
    };
  }, [editorDOMElement, element, handler]);

  // Reset before committing a menu with a stale highlight.
  const [previousQuery, setPreviousQuery] = useState(query);
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setSelectedIndex(0);
  }

  return {
    selectedIndex: items.length === 0 ? undefined : selectedIndex,
  };
}
