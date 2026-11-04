import { DefaultSuggestionItem } from "@blocknote/core/extensions";
import { JSX } from "react";

/**
 * Although any arbitrary data can be passed as suggestion items, the built-in
 * UI components such as `MantineSuggestionMenu` expect a shape that conforms to DefaultSuggestionItem
 */
export type DefaultReactSuggestionItem = Omit<DefaultSuggestionItem, "key"> & {
  /**
   * Tells apart items that share a title, so each keeps its row when the list
   * changes. Should be unique among items with the same title.
   */
  key?: string | number;
  icon?: JSX.Element;
  size?: "default" | "small";
};

/**
 * Props passed to a suggestion menu component
 */
// TODO: onItemClick should be required when T extends
//  DefaultReactSuggestionItem
export type SuggestionMenuProps<T> = {
  items: T[];
  loadingState: "loading-initial" | "loading" | "loaded";
  selectedIndex: number | undefined;
  onItemClick?: (item: T) => void;
};
