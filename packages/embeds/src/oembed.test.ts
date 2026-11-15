import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createOEmbedClient,
  metadataFromOEmbed,
  parseOEmbed,
} from "./oembed.js";
import { createEmbedResolver } from "../../xl-embed-server/src/index.js";

afterEach(() => vi.unstubAllGlobals());
describe("standard oEmbed client", () => {
  it("interoperates with the existing server's raw metadata response", async () => {
    const resolver = createEmbedResolver({
      protectedFetch: async () =>
        new Response(
          '<html><head><title>Example</title><meta property="og:description" content="Saved description"><meta property="og:image" content="https://example.org/image.jpg"></head><body>Article</body></html>',
          { headers: { "Content-Type": "text/html" } },
        ),
    });
    const transport = vi.fn(async (input: URL | RequestInfo) =>
      resolver.fetch(new Request(input)),
    );
    vi.stubGlobal("fetch", transport);
    const resolve = createOEmbedClient({
      endpoint: "https://app.example/oembed?tenant=demo",
    });
    const result = await resolve("https://EXAMPLE.org/article", {
      signal: new AbortController().signal,
    });
    if (result.status !== "success") {
      throw new Error("Expected metadata response");
    }
    expect(metadataFromOEmbed(result.value)).toEqual({
      title: "Example",
      description: "Saved description",
      imageUrl: "https://example.org/image.jpg",
    });
    const input = transport.mock.calls[0][0];
    const target = new URL(input instanceof Request ? input.url : input);
    expect(target.searchParams.get("tenant")).toBe("demo");
    expect(target.searchParams.get("url")).toBe("https://EXAMPLE.org/article");
  });
  it.each([
    {},
    { version: "1.0", type: "video", html: "<iframe>" },
    {
      version: "1.0",
      type: "photo",
      url: "https://a.org/p",
      width: NaN,
      height: 1,
    },
  ])("rejects invalid wire data", (input) => {
    expect(parseOEmbed(input)).toBeUndefined();
  });
  it("returns unavailable for expected transport, JSON and HTTP failures", async () => {
    const resolve = createOEmbedClient({
      endpoint: "https://app.example/oembed",
    });
    for (const transport of [
      async () => {
        throw new TypeError("Failed to fetch");
      },
      async () => new Response("bad json"),
      async () => new Response("no", { status: 503 }),
    ]) {
      vi.stubGlobal("fetch", transport);
      await expect(
        resolve("https://example.org", {
          signal: new AbortController().signal,
        }),
      ).resolves.toEqual({ status: "unavailable" });
    }
  });
  it("propagates unexpected exceptions", async () => {
    const error = new Error("broken transport");
    vi.stubGlobal("fetch", async () => {
      throw error;
    });
    await expect(
      createOEmbedClient({ endpoint: "https://app.example/oembed" })(
        "https://example.org",
        { signal: new AbortController().signal },
      ),
    ).rejects.toBe(error);
  });
});
