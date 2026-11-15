import { describe, expect, it, vi } from "vite-plus/test";
import { resolveSource } from "./resolve.js";

const photo = {
  version: "1.0",
  type: "photo",
  url: "https://assets.test/photo.jpg",
  width: 800,
  height: 1200,
};
const signal = new AbortController().signal;

describe("source versus discovered endpoint policy", () => {
  it.each([null, 480])(
    "retains page bookmark metadata alongside sparse discovered media (height: %s)",
    async (height) => {
      // Bluesky publishes useful OG data but its oEmbed payload has no title,
      // description or image and currently reports a null intrinsic height.
      const source = "https://bsky.app/profile/bsky.app/post/3kktuiwidw22d";
      const endpoint =
        "https://embed.bsky.app/oembed?format=json&url=at%3A%2F%2Fdid%3Aplc%3Az72i7hdynmk6r22z27h6tvur%2Fapp.bsky.feed.post%2F3kktuiwidw22d";
      const html =
        "<blockquote>Post text</blockquote><script src=embed.js></script>";
      const protectedFetch = vi
        .fn(async (_request: Request) =>
          Response.json({
            type: "rich",
            version: "1.0",
            author_name: "Bluesky (@bsky.app)",
            provider_name: "Bluesky Social",
            width: 600,
            height,
            html,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            `<meta property="og:title" content="Bluesky (@bsky.app)">
             <meta property="og:description" content="Welcome to Bluesky, everyone!">
             <meta property="og:image" content="https://cdn.bsky.app/avatar">
             <link rel="alternate" type="application/json+oembed" href="${endpoint}">`,
            { headers: { "Content-Type": "text/html" } },
          ),
        );
      const result = await resolveSource(
        source,
        {},
        { protectedFetch },
        signal,
      );
      expect(result).toMatchObject({
        type: height === null ? "link" : "rich",
        title: "Bluesky (@bsky.app)",
        description: "Welcome to Bluesky, everyone!",
        image_url: "https://cdn.bsky.app/avatar",
        author_name: "Bluesky (@bsky.app)",
        provider_name: "Bluesky Social",
      });
      expect(protectedFetch.mock.calls[1][0].url).toBe(endpoint);
      if (height !== null) {
        expect(result).toMatchObject({ html, width: 600, height });
      }
    },
  );

  it("validates direct JSON without rewriting source queries or clamping intrinsic photo dimensions", async () => {
    const source = new URL(
      "https://www.flickr.com/services/oembed/?url=original&format=custom&signed=a%20b%2Fc",
    );
    const protectedFetch = vi.fn(async (_request: Request) =>
      Response.json(photo),
    );
    expect(
      await resolveSource(
        source,
        { maxwidth: "100" },
        { protectedFetch },
        signal,
      ),
    ).toEqual(photo);
    expect(protectedFetch).toHaveBeenCalledTimes(1);
    expect(protectedFetch.mock.calls[0][0].url).toBe(source.href);
  });

  it("resolves discovery relative to the redirected page and adds only endpoint request parameters", async () => {
    const source = new URL("https://source.test/post?url=nested&signed=a%20b");
    const protectedFetch = vi
      .fn(async (_request: Request) => Response.json(photo))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "/final/post" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          '<link rel=alternate type="application/json+oembed" href="oembed?url=declared&amp;key=public">',
          { headers: { "Content-Type": "text/html" } },
        ),
      );
    expect(
      await resolveSource(
        source,
        { maxwidth: "500" },
        { protectedFetch },
        signal,
      ),
    ).toMatchObject({ ...photo, title: "source.test" });
    expect(protectedFetch.mock.calls[0][0].url).toBe(source.href);
    const endpoint = new URL(protectedFetch.mock.calls[2][0].url);
    expect(endpoint.pathname).toBe("/final/oembed");
    expect(Object.fromEntries(endpoint.searchParams)).toEqual({
      url: "declared",
      key: "public",
      format: "json",
      maxwidth: "500",
    });
    expect(source.href).toBe(
      "https://source.test/post?url=nested&signed=a%20b",
    );
  });

  it("supplies the submitted source when the discovery URL omits it", async () => {
    const source = new URL("https://source.test/post");
    const protectedFetch = vi
      .fn(async (_request: Request) => Response.json(photo))
      .mockResolvedValueOnce(
        new Response(
          '<link rel=alternate type="application/json+oembed" href="/api">',
          {
            headers: { "Content-Type": "text/html" },
          },
        ),
      );
    await resolveSource(source, {}, { protectedFetch }, signal);
    expect(
      new URL(protectedFetch.mock.calls[1][0].url).searchParams.get("url"),
    ).toBe(source.href);
  });

  it.each(["network", "invalid JSON", "unsupported media"])(
    "keeps page metadata when discovery fails: %s",
    async (failure) => {
      const source = new URL("https://source.test/post");
      const protectedFetch = vi
        .fn(async () => {
          if (failure === "network") {
            throw new TypeError("private network diagnostic");
          }
          return new Response(
            failure === "invalid JSON" ? "broken" : '{"type":"unknown"}',
            { headers: { "Content-Type": "application/json" } },
          );
        })
        .mockResolvedValueOnce(
          new Response(
            '<title>Keep this title</title><link rel=alternate type="application/json+oembed" href="/api">',
            { headers: { "Content-Type": "text/html" } },
          ),
        );
      expect(
        await resolveSource(source, {}, { protectedFetch }, signal),
      ).toMatchObject({ type: "link", title: "Keep this title" });
    },
  );
});
