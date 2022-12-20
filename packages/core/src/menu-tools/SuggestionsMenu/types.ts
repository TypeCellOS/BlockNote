import { Menu, MenuFactory } from "../types";
import SuggestionItem from "../../shared/plugins/suggestion/SuggestionItem";

export type SuggestionsMenuItem = {
  name: string;
  set: () => void;
};

export type SuggestionsMenuProps<T extends SuggestionItem> = {
  menuItems: {
    items: T[];
    selectedItemIndex: number;
    itemCallback: (item: T) => void;
  };
  view: {
    selectedBlockBoundingBox: DOMRect;
    editorElement: Element;
  };
};

export type SuggestionsMenu<T extends SuggestionItem> = Menu<
  SuggestionsMenuProps<T>
>;
export type SuggestionsMenuFactory<T extends SuggestionItem> = MenuFactory<
  SuggestionsMenuProps<T>
>;
