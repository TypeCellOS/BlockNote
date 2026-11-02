import { describe, expect, it } from "vite-plus/test";

import { renderToSizedSVG } from "./renderToSizedSVG.js";

describe("renderToSizedSVG", () => {
  it.each([
    "graph TD\n A[Start] --> B[End]",
    "sequenceDiagram\n Alice->>Bob: Hello",
    "classDiagram\n Animal <|-- Duck",
    "stateDiagram-v2\n [*] --> Active",
    'pie\n "One" : 1\n "Two" : 2',
    "journey\n title My day\n section Work\n Task: 5: Me",
  ])("renders Mermaid syntax without a browser: %s", async (source) => {
    const result = await renderToSizedSVG(source);
    expect(result.error).toBeUndefined();
    if (result.error !== undefined) {
      throw new Error(result.error);
    }
    expect(result.svg).toContain("pele");
    expect(result.svg).not.toContain("<foreignObject");
    // Standalone SVG consumers (including Typst) don't implement CSS variables.
    expect(result.svg).not.toContain("var(--");
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.svg).toContain(`width="${result.width}"`);
    expect(result.svg).toContain(`height="${result.height}"`);
  });

  it("scales the intrinsic SVG dimensions, not the display dimensions", async () => {
    const result = await renderToSizedSVG("graph TD\n A --> B", { scale: 2 });
    if (result.error !== undefined) {
      throw new Error(result.error);
    }
    expect(result.svg).toContain(`width="${result.width * 2}"`);
    expect(result.svg).toContain(`height="${result.height * 2}"`);
  });

  it("measures and renders in the supplied font", async () => {
    const result = await renderToSizedSVG("graph TD\n A --> B", {
      fontFamily: '"Document Font", sans-serif',
    });
    if (result.error !== undefined) {
      throw new Error(result.error);
    }
    expect(result.svg).toContain("Document Font");
  });

  it("returns invalid source as a typed expected error", async () => {
    const result = await renderToSizedSVG("not a diagram");
    expect(result).toEqual({ error: expect.any(String) });
  });

  it("preserves CSS-looking label text when resolving export colors", async () => {
    const result = await renderToSizedSVG('graph TD\n A["var(--_fg)"]');
    if (result.error !== undefined) {
      throw new Error(result.error);
    }
    expect(result.svg).toContain(">var(--_fg)</text>");
    expect(result.svg).toContain('fill="#1f1f1f"');
  });

  it("uses distinct accessibility IDs for separate diagrams", async () => {
    const source = "graph TD\n accTitle: Example\n A --> B";
    const first = await renderToSizedSVG(source);
    const second = await renderToSizedSVG(source);
    if (first.error !== undefined || second.error !== undefined) {
      throw new Error("Expected valid diagrams");
    }
    expect(first.svg.match(/aria-labelledby="([^"]+)"/)?.[1]).toBeTruthy();
    expect(first.svg.match(/aria-labelledby="([^"]+)"/)?.[1]).not.toBe(
      second.svg.match(/aria-labelledby="([^"]+)"/)?.[1],
    );
  });
});
