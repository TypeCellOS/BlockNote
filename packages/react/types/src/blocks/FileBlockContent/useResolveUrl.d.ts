export declare function useResolveUrl(fetchUrl: string): {
    loadingState: "loading" | "error";
    downloadUrl?: undefined;
} | {
    loadingState: "loaded";
    downloadUrl: string;
};
