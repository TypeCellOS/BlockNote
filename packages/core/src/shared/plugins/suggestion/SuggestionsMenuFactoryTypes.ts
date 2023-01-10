import { SuggestionItem } from "./SuggestionItem";
import { EditorElement, ElementFactory } from "../../../EditorElement";

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
