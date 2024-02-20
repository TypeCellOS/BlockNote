import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  DefaultSuggestionItem,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

/**
 * Although any arbitrary data can be passed as suggestion items, the built-in
 * UI components such as `MantineSuggestionMenu` expect a shape that conforms to DefaultSuggestionItem
 */
export type DefaultReactSuggestionItem<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = DefaultSuggestionItem<BSchema, I, S> & {
  icon?: JSX.Element;
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
