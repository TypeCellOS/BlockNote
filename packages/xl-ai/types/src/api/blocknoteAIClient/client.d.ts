/**
 * Create a client to connect to the @blocknote/xl-ai-server AI server.
 * The BlockNote AI server is a proxy for AI model providers. It allows you to connect to
 * AI SDKs without exposing your model provider's API keys on the client.
 *
 * @param config - settings to connect to the @blocknote/xl-ai-server AI server
 * @returns a client to connect to the @blocknote/xl-ai-server AI server.
 * Use the `getProviderSettings` method to get the provider settings for the AI SDKs,
 * this will configure the AI SDK model to connect via the @blocknote/xl-ai-server AI server.
 */
export declare function createBlockNoteAIClient(config: {
    /**
     * baseURL of the @blocknote/xl-ai-server AI server
     */
    baseURL: string;
    /**
     * API key for the @blocknote/xl-ai-server AI server
     */
    apiKey: string;
}): {
    /**
     * Get settings for AI SDK providers. Pass the returned objects when creating the AI SDK provider, e.g.:
     *
     * createOpenAI({
     *   ...client.getProviderSettings("openai"),
     * })("gpt-4o-2024-08-06", {});
     *
     * Explanation: we override the `fetch` and `apiKey` parameters of the AI SDK provider to instead
     * use the BlockNote AI server to proxy requests to the provider.
     *
     * Note: the `apiKey` is the API key for the @blocknote/xl-ai-server AI server, not the model provider.
     * The correct API key for the model provider will be added by the BlockNote AI server.
     */
    getProviderSettings: (provider: "openai" | "groq" | string) => {
        apiKey: string;
        fetch: (input: string | URL | Request, init?: RequestInit | undefined) => Promise<Response>;
    };
};
