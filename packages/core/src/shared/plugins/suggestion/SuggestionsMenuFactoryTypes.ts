import { EditorElement, ElementFactory } from "../../EditorElement";
import { SuggestionItem } from "./SuggestionItem";

export type SuggestionsMenuStaticParams<T extends SuggestionItem> = {
  itemCallback: (item: T) => void;
};

export type SuggestionsMenuDynamicParams<T extends SuggestionItem> = {
  items: T[];
  keyboardHoveredItemIndex: number;

  referenceRect: DOMRect;
};

export type SuggestionsMenu<T extends SuggestionItem> = EditorElement<
  SuggestionsMenuDynamicParams<T>
>;
export type SuggestionsMenuFactory<T extends SuggestionItem> = ElementFactory<
  SuggestionsMenuStaticParams<T>,
  SuggestionsMenuDynamicParams<T>
>;
