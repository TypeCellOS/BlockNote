import { describe, expect, it } from "vite-plus/test";
import { parseSourceUrl } from "./url.js";
import { youtubeVideoId, youtubeProvider } from "./providers/youtube.js";
import { SourceCard } from "./components.js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("source URLs", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,a",
    "https://user:pass@example.org",
    "https://a.org https://b.org",
    "not a URL",
    "https:example.org",
    "https:/example.org",
    "https:///example.org",
    "https:////example.org",
    "https://\\example.org",
    "https://example.org/\u0000",
  ])("rejects %s", (input) => {
    expect(parseSourceUrl(input)).toBeUndefined();
  });
  it("does not render unsafe persisted source or image URLs", () => {
    expect(
      renderToStaticMarkup(
        createElement(SourceCard, { url: "javascript:alert(1)" }),
      ),
    ).not.toContain("<a ");
    expect(
      renderToStaticMarkup(
        createElement(SourceCard, {
          url: "https://example.org",
          metadata: { imageUrl: "data:image/svg+xml,bad" },
        }),
      ),
    ).not.toContain("<img");
  });
  it("only matches supported YouTube hosts and IDs", () => {
    expect(youtubeVideoId(new URL("https://youtu.be/jNQXAC9IVRw"))).toBe(
      "jNQXAC9IVRw",
    );
    expect(
      youtubeVideoId(new URL("https://youtube.com/shorts/jNQXAC9IVRw")),
    ).toBe("jNQXAC9IVRw");
    expect(
      youtubeVideoId(
        new URL("https://youtube.com.attacker.org/watch?v=jNQXAC9IVRw"),
      ),
    ).toBeUndefined();
    expect(
      youtubeVideoId(new URL("https://youtube.com/watch?v=bad")),
    ).toBeUndefined();
  });
  it("gives YouTube the origin-only referrer policy its player requires", () => {
    const html = renderToStaticMarkup(
      createElement(youtubeProvider.component, {
        url: "https://youtu.be/jNQXAC9IVRw",
      }),
    );
    expect(html).toContain('referrerPolicy="strict-origin-when-cross-origin"');
    expect(html).toContain(
      "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw",
    );
  });
});
