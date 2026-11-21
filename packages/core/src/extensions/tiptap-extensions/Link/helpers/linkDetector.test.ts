// @vitest-environment node
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vite-plus/test";
import { findLinks } from "./linkDetector.js";

describe("findLinks", () => {
  // The test runner cannot stop a synchronous call: a search that does not
  // end blocks the test run. `runInNewContext` stops the search after
  // 5 seconds, and the test fails.
  function findLinksWithTimeLimit(text: string): unknown {
    return runInNewContext(
      "findLinks(text)",
      { findLinks, text },
      { timeout: 5000 },
    );
  }

  describe("long text without white space", () => {
    it("finds no link in a token of 100,000 letters", () => {
      expect(findLinksWithTimeLimit("a".repeat(100_000))).toEqual([]);
    });

    it("finds no link in `www.` repeated 25,000 times", () => {
      expect(findLinksWithTimeLimit("www.".repeat(25_000))).toEqual([]);
    });

    it("finds no link in 50,000 hostname labels without a TLD", () => {
      expect(findLinksWithTimeLimit("1.".repeat(50_000))).toEqual([]);
    });

    it("finds a URL of 100,000 characters", () => {
      const url = "example.com/" + "a".repeat(100_000);

      expect(findLinksWithTimeLimit(url)).toEqual([
        {
          type: "url",
          value: url,
          isLink: true,
          href: "http://" + url,
          start: 0,
          end: url.length,
        },
      ]);
    });

    it("keeps 100,000 commas in the middle of a URL", () => {
      const url = "example.com/" + ",".repeat(100_000) + "a";

      expect(findLinksWithTimeLimit(url)).toEqual([
        {
          type: "url",
          value: url,
          isLink: true,
          href: "http://" + url,
          start: 0,
          end: url.length,
        },
      ]);
    });

    const urlWithoutTrailingCharacters = [
      {
        type: "url",
        value: "example.com/a",
        isLink: true,
        href: "http://example.com/a",
        start: 0,
        end: 13,
      },
    ];

    it("trims 100,000 closing brackets after a URL", () => {
      expect(
        findLinksWithTimeLimit("example.com/a" + ")".repeat(100_000)),
      ).toEqual(urlWithoutTrailingCharacters);
    });

    it("trims 50,000 pairs of a period and a closing bracket after a URL", () => {
      expect(
        findLinksWithTimeLimit("example.com/a" + ".)".repeat(50_000)),
      ).toEqual(urlWithoutTrailingCharacters);
    });
  });
});
