export declare function useLoadSuggestionMenuItems<T>(query: string, getItems: (query: string) => Promise<T[]>): {
    items: T[];
    usedQuery: string | undefined;
    loadingState: "loading-initial" | "loading" | "loaded";
};
