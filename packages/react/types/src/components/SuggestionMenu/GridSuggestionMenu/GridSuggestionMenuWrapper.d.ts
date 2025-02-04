import { FC } from "react";
import { GridSuggestionMenuProps } from "./types.js";
export declare function GridSuggestionMenuWrapper<Item>(props: {
    query: string;
    closeMenu: () => void;
    clearQuery: () => void;
    getItems: (query: string) => Promise<Item[]>;
    columns: number;
    onItemClick?: (item: Item) => void;
    gridSuggestionMenuComponent: FC<GridSuggestionMenuProps<Item>>;
}): import("react/jsx-runtime").JSX.Element;
