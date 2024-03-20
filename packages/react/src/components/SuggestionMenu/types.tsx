import { DefaultSuggestionItem } from "@blocknote/core";

/**
 * Although any arbitrary data can be passed as suggestion items, the built-in
 * UI components such as `MantineSuggestionMenu` expect a shape that conforms to DefaultSuggestionItem
 */
export type DefaultReactSuggestionItem = DefaultSuggestionItem & {
  icon?: JSX.Element;
};

/**
 * Props passed to a suggestion menu component
 */
// TODO: onItemClick should be required when T extends
//  DefaultReactSuggestionItem
export type SuggestionMenuProps<T> = {
  items: T[];
  loadingState: "loading-initial" | "loading" | "loaded";
  opened: boolean;
  onItemClick?: (item: T) => void;
  closeMenu: () => void;
  referencePos: { left: number; top: number };
};
