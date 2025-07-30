import { DefaultGridSuggestionItem } from "@blocknote/core";
import { JSX } from "react";

import { SuggestionMenuProps } from "../types.js";

export type DefaultReactGridSuggestionItem = DefaultGridSuggestionItem & {
  icon?: JSX.Element;
};

export type GridSuggestionMenuProps<T> = SuggestionMenuProps<T> & {
  columns: number;
};
