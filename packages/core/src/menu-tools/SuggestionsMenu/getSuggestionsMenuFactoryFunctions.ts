import { SuggestionsMenuFactoryFunctions } from "./types";
import SuggestionItem from "../../shared/plugins/suggestion/SuggestionItem";

// TODO: Only need either getQuery or matchesQuery, not both. Depends if we want to allow users the ability to define
//  their own block type aliases/matching algorithm.
export function getSuggestionsMenuFactoryFunctions<T extends SuggestionItem>(
  items: T[],
  selectedItemIndex: number,
  itemCallback: (item: T) => void,
  selectedBlockBoundingBox: DOMRect
): SuggestionsMenuFactoryFunctions<T> {
  return {
    menuItems: {
      items: items,
      selectedItemIndex: selectedItemIndex,
      itemCallback: itemCallback,
    },
    view: {
      selectedBlockBoundingBox: selectedBlockBoundingBox,
    },
  };
}
