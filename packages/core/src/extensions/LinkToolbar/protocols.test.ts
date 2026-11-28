import { describe, expect, it } from "vite-plus/test";

import { isAllowedUri } from "../tiptap-extensions/Link/link.js";
import { normalizeLinkUrl } from "./protocols.js";

const allowCustomScheme = (href: string) =>
  href.startsWith("myapp://") || isAllowedUri(href);

describe("normalizeLinkUrl", () => {
  it("keeps URLs with a default protocol", () => {
    expect(normalizeLinkUrl("https://example.com", isAllowedUri)).toBe(
      "https://example.com",
    );
    expect(normalizeLinkUrl("mailto:hi@example.com", isAllowedUri)).toBe(
      "mailto:hi@example.com",
    );
  });

  it("prepends the default protocol to addresses without one", () => {
    expect(normalizeLinkUrl("example.com", isAllowedUri)).toBe(
      "https://example.com",
    );
    expect(normalizeLinkUrl("example.com", allowCustomScheme)).toBe(
      "https://example.com",
    );
  });

  it("keeps a custom scheme accepted by isValidLink", () => {
    expect(normalizeLinkUrl("myapp://page/1", allowCustomScheme)).toBe(
      "myapp://page/1",
    );
  });

  it("prepends the default protocol to a scheme isValidLink rejects", () => {
    expect(normalizeLinkUrl("myapp://page/1", isAllowedUri)).toBe(
      "https://myapp://page/1",
    );
    expect(normalizeLinkUrl("otherapp://page/1", allowCustomScheme)).toBe(
      "https://otherapp://page/1",
    );
  });
});
