import { DefaultGridSuggestionItem } from "@blocknote/core";

import { SuggestionMenuProps } from "../types";

export type DefaultReactGridSuggestionItem = DefaultGridSuggestionItem & {
  icon?: JSX.Element;
};

export type GridSuggestionMenuProps<T> = SuggestionMenuProps<T> & {
  columns: number;
};
