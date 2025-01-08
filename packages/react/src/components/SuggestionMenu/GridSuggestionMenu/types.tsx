import { DefaultGridSuggestionItem } from "@blocknote/core";
import { FC } from "react";

import { SuggestionMenuProps } from "../types.js";

export type DefaultReactGridSuggestionItem = DefaultGridSuggestionItem & {
  icon?: FC;
};

export type GridSuggestionMenuProps<T> = SuggestionMenuProps<T> & {
  columns: number;
};
