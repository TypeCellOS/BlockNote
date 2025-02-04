import React from "react";
export declare function useSuggestionMenuKeyboardHandler<Item>(items: Item[], onItemClick?: (item: Item) => void): {
    selectedIndex: number;
    setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
    handler: (event: KeyboardEvent | React.KeyboardEvent) => boolean;
};
