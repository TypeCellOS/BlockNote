import { SuggestionItem } from "../../shared/plugins/suggestion/SuggestionItem";
import { Menu, MenuFactory } from "../types";

export type SuggestionsMenuItem = {
  name: string;
  set: () => void;
};

export type SuggestionsMenuParams<T extends SuggestionItem> = {
  items: T[];
  selectedItemIndex: number;
  itemCallback: (item: T) => void;

  queryStartBoundingBox: DOMRect;
  editorElement: Element;
};

export type SuggestionsMenu<T extends SuggestionItem> = Menu<
  SuggestionsMenuParams<T>
>;
export type SuggestionsMenuFactory<T extends SuggestionItem> = MenuFactory<
  SuggestionsMenuParams<T>
>;
