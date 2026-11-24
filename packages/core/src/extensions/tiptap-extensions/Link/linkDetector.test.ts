import { describe, expect, it } from "vite-plus/test";

import { findLinks, tokenizeLink } from "./helpers/linkDetector.js";

/** Wrapper matching the old tokenize().map(t => t.toObject(defaultProtocol)) pattern */
function tokenizeToObjects(text: string, defaultProtocol = "http") {
  return tokenizeLink(text, defaultProtocol);
}

describe("findLinks() baseline behavior", () => {
  describe("basic URL detection", () => {
    it("detects https URLs", () => {
      const results = findLinks("https://example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "https://example.com",
        href: "https://example.com",
        start: 0,
        end: 19,
      });
    });

    it("detects http URLs", () => {
      const results = findLinks("http://example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "http://example.com",
        href: "http://example.com",
      });
    });

    it("detects schemeless URLs and prepends default protocol", () => {
      const results = findLinks("example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "example.com",
        href: "http://example.com",
        start: 0,
        end: 11,
      });
    });

    it("respects defaultProtocol option", () => {
      const results = findLinks("example.com", { defaultProtocol: "https" });
      expect(results).toHaveLength(1);
      expect(results[0].href).toBe("https://example.com");
    });

    it("detects www URLs", () => {
      const results = findLinks("www.example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "www.example.com",
        href: "http://www.example.com",
      });
    });
  });

  describe("multiple URLs in text", () => {
    it("finds multiple URLs with correct positions", () => {
      const results = findLinks("Visit https://a.com and https://b.com");
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        value: "https://a.com",
        start: 6,
        end: 19,
      });
      expect(results[1]).toMatchObject({
        value: "https://b.com",
        start: 24,
        end: 37,
      });
    });

    it("finds multiple schemeless URLs", () => {
      const results = findLinks("Check example.com or test.org");
      expect(results).toHaveLength(2);
      expect(results[0].value).toBe("example.com");
      expect(results[1].value).toBe("test.org");
    });
  });

  describe("URLs with paths, queries, and fragments", () => {
    it("includes full path", () => {
      const results = findLinks("https://example.com/path/to/page");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/path/to/page");
    });

    it("includes query string", () => {
      const results = findLinks("https://example.com?q=hello&b=world");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com?q=hello&b=world");
    });

    it("includes fragment", () => {
      const results = findLinks("https://example.com#section");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com#section");
    });

    it("includes path + query + fragment", () => {
      const results = findLinks("https://example.com/path?q=1#frag");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/path?q=1#frag");
    });

    it("includes encoded characters", () => {
      const results = findLinks("https://example.com/path%20name");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/path%20name");
    });

    it("includes trailing slash", () => {
      const results = findLinks("https://example.com/");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/");
    });
  });

  describe("URLs with ports", () => {
    it("detects URL with port", () => {
      const results = findLinks("https://example.com:8080");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com:8080");
    });

    it("detects schemeless URL with port and path", () => {
      const results = findLinks("example.com:3000/path");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "example.com:3000/path",
        href: "http://example.com:3000/path",
      });
    });
  });

  describe("trailing punctuation handling", () => {
    it("excludes trailing period", () => {
      const results = findLinks("Visit https://example.com.");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com");
    });

    it("excludes trailing comma", () => {
      const results = findLinks("See https://example.com, and more");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com");
    });

    it("excludes surrounding parentheses", () => {
      const results = findLinks("(https://example.com)");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "https://example.com",
        start: 1,
        end: 20,
      });
    });

    it("keeps balanced parentheses in path (Wikipedia-style)", () => {
      const results = findLinks("https://en.wikipedia.org/wiki/Foo_(bar)");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://en.wikipedia.org/wiki/Foo_(bar)");
    });
  });

  describe("non-links", () => {
    it("returns empty for plain text", () => {
      expect(findLinks("not a link")).toHaveLength(0);
    });

    it("returns empty for single word", () => {
      expect(findLinks("hello")).toHaveLength(0);
    });

    it("returns empty for empty string", () => {
      expect(findLinks("")).toHaveLength(0);
    });

    it("returns empty for just a protocol", () => {
      expect(findLinks("https://")).toHaveLength(0);
    });

    it("does not detect bare IP addresses", () => {
      expect(findLinks("192.168.1.1")).toHaveLength(0);
    });
  });

  describe("domain variations", () => {
    it("detects hyphenated domains", () => {
      const results = findLinks("my-site.example.com");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("my-site.example.com");
    });

    it("detects subdomains", () => {
      const results = findLinks("sub.domain.example.com");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("sub.domain.example.com");
    });
  });

  describe("URL position in text", () => {
    it("detects URL at end of text", () => {
      const results = findLinks("go to example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "example.com",
        start: 6,
        end: 17,
      });
    });

    it("detects URL at start of text", () => {
      const results = findLinks("example.com is great");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "example.com",
        start: 0,
        end: 11,
      });
    });
  });

  describe("protocol variations", () => {
    it("detects ftp URLs", () => {
      const results = findLinks("ftp://files.example.com");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("ftp://files.example.com");
    });

    it("detects mailto URLs", () => {
      const results = findLinks("mailto:user@example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        value: "mailto:user@example.com",
        href: "mailto:user@example.com",
      });
    });

    it("detects bare email addresses as links", () => {
      const results = findLinks("user@example.com");
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isLink: true,
        value: "user@example.com",
        href: "mailto:user@example.com",
      });
    });
  });

  describe("boundary handling", () => {
    it("stops at whitespace", () => {
      const results = findLinks("https://example.com/path with spaces");
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe("https://example.com/path");
    });
  });
});

describe("tokenizeLink() baseline behavior", () => {
  describe("single valid links", () => {
    it("tokenizes schemeless URL as single link token", () => {
      const tokens = tokenizeToObjects("example.com");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "example.com",
        href: "http://example.com",
        start: 0,
        end: 11,
      });
    });

    it("tokenizes https URL as single link token", () => {
      const tokens = tokenizeToObjects("https://example.com");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "https://example.com",
        href: "https://example.com",
      });
    });

    it("tokenizes URL with path as single link token", () => {
      const tokens = tokenizeToObjects("example.com/path");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "example.com/path",
        href: "http://example.com/path",
      });
    });

    it("tokenizes www URL as single link token", () => {
      const tokens = tokenizeToObjects("www.example.com");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "www.example.com",
        href: "http://www.example.com",
      });
    });

    it("tokenizes URL with https and path as single link token", () => {
      const tokens = tokenizeToObjects("https://example.com/path");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "https://example.com/path",
        href: "https://example.com/path",
      });
    });

    it("tokenizes short TLD (2 chars) as link", () => {
      const tokens = tokenizeToObjects("test.co");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(true);
    });
  });

  describe("bracket-wrapped links", () => {
    it("tokenizes (url) as 3 tokens with link in middle", () => {
      const tokens = tokenizeToObjects("(example.com)");
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({
        isLink: false,
        value: "(",
        start: 0,
        end: 1,
      });
      expect(tokens[1]).toMatchObject({
        isLink: true,
        value: "example.com",
        href: "http://example.com",
        start: 1,
        end: 12,
      });
      expect(tokens[2]).toMatchObject({
        isLink: false,
        value: ")",
        start: 12,
        end: 13,
      });
    });

    it("tokenizes [url] as 3 tokens with link in middle", () => {
      const tokens = tokenizeToObjects("[example.com]");
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ isLink: false, value: "[" });
      expect(tokens[1]).toMatchObject({
        isLink: true,
        value: "example.com",
      });
      expect(tokens[2]).toMatchObject({ isLink: false, value: "]" });
    });

    it("tokenizes (https://url) as 3 tokens", () => {
      const tokens = tokenizeToObjects("(https://example.com)");
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ isLink: false, value: "(" });
      expect(tokens[1]).toMatchObject({
        isLink: true,
        value: "https://example.com",
        href: "https://example.com",
      });
      expect(tokens[2]).toMatchObject({ isLink: false, value: ")" });
    });
  });

  describe("non-links", () => {
    it("tokenizes plain word as non-link", () => {
      const tokens = tokenizeToObjects("notaurl");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });

    it("tokenizes domain with trailing number as non-link", () => {
      // This is a key behavior: example.com1 is NOT a valid link
      // because the TLD is "com1" which is not valid
      const tokens = tokenizeToObjects("example.com1");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });

    it("tokenizes single-char TLD as non-link", () => {
      const tokens = tokenizeToObjects("test.x");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });

    it("tokenizes single-char hostname as non-link", () => {
      const tokens = tokenizeToObjects("a.bc");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("tokenizes IP address as non-link", () => {
      const tokens = tokenizeToObjects("192.168.1.1");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(false);
    });

    it("tokenizes localhost as link (filtered downstream by shouldAutoLink)", () => {
      const tokens = tokenizeToObjects("localhost");
      expect(tokens).toHaveLength(1);
      expect(tokens[0].isLink).toBe(true);
    });

    it("tokenizes url with trailing dot as url + dot tokens", () => {
      const tokens = tokenizeToObjects("example.com.");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        isLink: true,
        value: "example.com",
      });
      expect(tokens[1]).toMatchObject({
        isLink: false,
        value: ".",
      });
    });

    it("tokenizes {url} as 3 tokens (curly braces)", () => {
      const tokens = tokenizeToObjects("{example.com}");
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ isLink: false, value: "{" });
      expect(tokens[1]).toMatchObject({ isLink: true, value: "example.com" });
      expect(tokens[2]).toMatchObject({ isLink: false, value: "}" });
    });

    it("respects defaultProtocol parameter", () => {
      const tokens = tokenizeToObjects("example.com", "https");
      expect(tokens[0].href).toBe("https://example.com");
    });
  });
});
