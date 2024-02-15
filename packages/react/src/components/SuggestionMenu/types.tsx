/**
 * Although any arbitrary data can be passed as suggestion items, the built-in
 * UI components such as `MantineSuggestionMenu` expect a shape that conforms to DefaultSuggestionItem
 */
export type DefaultSuggestionItem = {
  title: string;
  group?: string;
  subtext?: string;
  icon?: JSX.Element;
  badge?: string;
};

/**
 * Props passed to a suggestion menu component
 */
export type SuggestionMenuProps<T> = {
  items: T[];
  loadingState: "loading-initial" | "loading" | "loaded";
  selectedIndex: number;
  onItemClick?: (item: T) => void;
};
