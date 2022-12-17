import { BubbleMenuFactoryFunctions } from "./BubbleMenu/types";
import { HyperlinkHoverMenuFactoryFunctions } from "./HyperlinkHoverMenu/types";
import { SuggestionsMenuFactoryFunctions } from "./SuggestionsMenu/types";
import SuggestionItem from "../shared/plugins/suggestion/SuggestionItem";

export type MenuUpdateProps<T extends SuggestionItem> =
  | BubbleMenuFactoryFunctions
  | HyperlinkHoverMenuFactoryFunctions
  | SuggestionsMenuFactoryFunctions<T>;

export type Menu<T extends SuggestionItem> = {
  element: HTMLElement | undefined;
  show: (props: MenuUpdateProps<T>) => void;
  hide: () => void;
  update: (newProps: MenuUpdateProps<T>) => void;
};
