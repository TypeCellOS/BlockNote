import { FC } from "react";
import { SuggestionMenuProps } from "./types.js";
export declare function SuggestionMenuWrapper<Item>(props: {
    query: string;
    closeMenu: () => void;
    clearQuery: () => void;
    getItems: (query: string) => Promise<Item[]>;
    onItemClick?: (item: Item) => void;
    suggestionMenuComponent: FC<SuggestionMenuProps<Item>>;
}): import("react/jsx-runtime").JSX.Element;
