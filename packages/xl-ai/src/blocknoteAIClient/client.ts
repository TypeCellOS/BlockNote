/**
 * Fetch function to proxy requests to the @blocknote/xl-ai-server AI server.
 */
const fetchViaBlockNoteAIServer =
  (baseURL: string, provider: string) =>
  async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);

    // console.log("fetchViaBlockNoteAIServer", baseURL, provider, request);
    const newRequest = new Request(
      `${baseURL}?provider=${encodeURIComponent(
        provider,
      )}&url=${encodeURIComponent(request.url)}`,
      {
        headers: request.headers,
        // if we just pass request.body, it's a readablestream which is not visible in chrome inspector,
        // so use init?.body instead if it's available to make debugging easier
        body: init?.body || request.body,
        method: request.method,
        duplex: "half",
      } as any,
    );
    try {
      const resp = await fetch(newRequest);
      return resp;
    } catch (e) {
      // Temp fix for https://github.com/vercel/ai/issues/6370
      throw new TypeError("fetch failed", {
        cause: e,
      });
    }
  };

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
export function createBlockNoteAIClient(config: {
  /**
   * baseURL of the @blocknote/xl-ai-server AI server
   */
  baseURL: string;
  /**
   * API key for the @blocknote/xl-ai-server AI server
   */
  apiKey: string;
}) {
  return {
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
      return {
        apiKey: config.apiKey,
        fetch: fetchViaBlockNoteAIServer(config.baseURL, provider),
      };
    },
  };
}
