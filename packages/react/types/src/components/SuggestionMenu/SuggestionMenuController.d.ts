import { UseFloatingOptions } from "@floating-ui/react";
import { FC } from "react";
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "./types.js";
type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
type ItemType<GetItemsType extends (query: string) => Promise<any[]>> = ArrayElement<Awaited<ReturnType<GetItemsType>>>;
export declare function SuggestionMenuController<GetItemsType extends (query: string) => Promise<any[]> = (query: string) => Promise<DefaultReactSuggestionItem[]>>(props: {
    triggerCharacter: string;
    getItems?: GetItemsType;
    minQueryLength?: number;
    floatingOptions?: Partial<UseFloatingOptions>;
} & (ItemType<GetItemsType> extends DefaultReactSuggestionItem ? {
    suggestionMenuComponent?: FC<SuggestionMenuProps<ItemType<GetItemsType>>>;
    onItemClick?: (item: ItemType<GetItemsType>) => void;
} : {
    suggestionMenuComponent: FC<SuggestionMenuProps<ItemType<GetItemsType>>>;
    onItemClick: (item: ItemType<GetItemsType>) => void;
})): import("react/jsx-runtime").JSX.Element | null;
export {};
