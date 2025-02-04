/**
 * Combines items by group. This can be used to combine multiple slash menu item arrays,
 * while making sure that items from the same group are adjacent to each other.
 */
export declare function combineByGroup<T extends {
    group?: string;
}>(items: T[], ...additionalItemsArray: {
    group?: string;
}[][]): T[];
