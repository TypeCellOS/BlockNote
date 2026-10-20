import { describe, expect, test } from "vite-plus/test";

import { renderDiagramToSVG } from "./renderDiagramToSVG.js";

// Browser unit tests for the SVG renderer used by the Typst
// exporter mapping. Runs in the tests package's browser suite.
describe("renderDiagramToSVG", () => {
  test(
    "renders Mermaid source to sized, foreignObject-free SVG",
    { timeout: 15000 },
    async () => {
      const result = await renderDiagramToSVG(
        "graph TD\n  A[Start] --> B[End]",
      );
      if (result.error !== undefined) {
        throw new Error(`Expected a successful render: ${result.error}`);
      }

      expect(result.image.mimeType).toBe("image/svg+xml");
      expect(result.image.width).toBeGreaterThan(0);
      expect(result.image.height).toBeGreaterThan(0);

      const svg = new TextDecoder().decode(result.image.data);
      // Labels must be SVG text: <foreignObject> HTML labels (Mermaid's
      // default for flowcharts) only display in browsers - SVG consumers
      // like Typst skip them, dropping every label.
      expect(svg).not.toContain("<foreignObject");
      expect(svg).toContain("Start");
      // Explicit intrinsic dimensions, and no `max-width` style capping them.
      expect(svg).toMatch(/<svg[^>]*\bwidth="\d+"/);
      expect(svg).toMatch(/<svg[^>]*\bheight="\d+"/);
      expect(svg).not.toContain("max-width");
      expect(svg).not.toContain("var(--");
    },
  );

  test(
    "renders labels in the given font family",
    { timeout: 15000 },
    async () => {
      const result = await renderDiagramToSVG(
        "graph TD\n  A[Start] --> B[End]",
        {
          fontFamily: '"Inter 18pt", sans-serif',
        },
      );
      if (result.error !== undefined) {
        throw new Error(`Expected a successful render: ${result.error}`);
      }
      const svg = new TextDecoder().decode(result.image.data);
      expect(svg).toContain("Inter 18pt");
      // The renderer uses the export font rather than Mermaid's font stack.
      expect(svg).not.toContain("trebuchet");
    },
  );

  test(
    "returns invalid Mermaid source as a typed error",
    { timeout: 15000 },
    async () => {
      const result = await renderDiagramToSVG("not a diagram");
      expect(result.error).toBeDefined();
    },
  );
});
