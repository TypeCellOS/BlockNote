import { describe, expect, it } from "vite-plus/test";

import { isLink, isStyledText, isTableContent } from "./types.js";

describe("type guards", () => {
  it("find styled text and links", () => {
    const text = { type: "text" as const, text: "a", styles: {} };
    const link = { type: "link" as const, href: "#", content: [text] };
    const mention = { type: "mention", props: {} };

    expect([text, link, mention].map(isStyledText)).toEqual([
      true,
      false,
      false,
    ]);
    expect([text, link, mention].map(isLink)).toEqual([false, true, false]);
  });

  it("find table content", () => {
    expect(
      isTableContent({ type: "tableContent", columnWidths: [], rows: [] }),
    ).toBe(true);
    expect(isTableContent([])).toBe(false);
    expect(isTableContent(undefined)).toBe(false);
  });
});
