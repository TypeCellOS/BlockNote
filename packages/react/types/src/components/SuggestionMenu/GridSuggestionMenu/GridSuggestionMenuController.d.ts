import { UseFloatingOptions } from "@floating-ui/react";
import { FC } from "react";
import { DefaultReactGridSuggestionItem, GridSuggestionMenuProps } from "./types.js";
type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
type ItemType<GetItemsType extends (query: string) => Promise<any[]>> = ArrayElement<Awaited<ReturnType<GetItemsType>>>;
export declare function GridSuggestionMenuController<GetItemsType extends (query: string) => Promise<any[]> = (query: string) => Promise<DefaultReactGridSuggestionItem[]>>(props: {
    triggerCharacter: string;
    getItems?: GetItemsType;
    columns: number;
    minQueryLength?: number;
    floatingOptions?: Partial<UseFloatingOptions>;
} & (ItemType<GetItemsType> extends DefaultReactGridSuggestionItem ? {
    gridSuggestionMenuComponent?: FC<GridSuggestionMenuProps<ItemType<GetItemsType>>>;
    onItemClick?: (item: ItemType<GetItemsType>) => void;
} : {
    gridSuggestionMenuComponent: FC<GridSuggestionMenuProps<ItemType<GetItemsType>>>;
    onItemClick: (item: ItemType<GetItemsType>) => void;
})): import("react/jsx-runtime").JSX.Element | null;
export {};
