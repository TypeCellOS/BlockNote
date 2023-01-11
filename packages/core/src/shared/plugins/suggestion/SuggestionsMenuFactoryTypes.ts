import { EditorElement, ElementFactory } from "../../EditorElement";
import { SuggestionItem } from "./SuggestionItem";

export type SuggestionsMenuParams<T extends SuggestionItem> = {
  items: T[];
  selectedItemIndex: number;
  itemCallback: (item: T) => void;

  queryStartBoundingBox: DOMRect;
  editorElement: Element;
};

export type SuggestionsMenu<T extends SuggestionItem> = EditorElement<
  SuggestionsMenuParams<T>
>;
export type SuggestionsMenuFactory<T extends SuggestionItem> = ElementFactory<
  SuggestionsMenuParams<T>
>;
