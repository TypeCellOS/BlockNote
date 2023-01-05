import { SuggestionItem } from "./SuggestionItem";
import { Menu, MenuFactory } from "../../../MenuFactoryTypes";

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
