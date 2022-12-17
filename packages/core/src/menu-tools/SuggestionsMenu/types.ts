import { Menu } from "../types";
import SuggestionItem from "../../shared/plugins/suggestion/SuggestionItem";

export type SuggestionsMenuItem = {
  name: string;
  set: () => void;
};

export type SuggestionsMenuFactoryFunctions<T extends SuggestionItem> = {
  menuItems: {
    items: T[];
    selectedItemIndex: number;
    itemCallback: (item: T) => void;
  };
  view: {
    selectedBlockBoundingBox: DOMRect;
  };
};

export type SuggestionsMenuFactory<T extends SuggestionItem> = (
  functions: SuggestionsMenuFactoryFunctions<T>
) => Menu<T>;
