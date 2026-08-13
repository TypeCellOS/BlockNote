import { exportImageToDataURL } from "@blocknote/core";
import { decodeAndSample } from "@shared/util/browserImageTestUtil.js";
import { describe, expect, test } from "vite-plus/test";

import { renderDiagramToImage } from "./renderDiagramToImage.js";

// Browser unit tests for the browser-only Mermaid renderer - the
// `RenderDiagram` implementation that the (node) unit suites replace with
// stubs. Runs in the tests package's browser suite.
describe("renderDiagramToImage", () => {
  test(
    "renders Mermaid source to a non-blank PNG",
    { timeout: 15000 },
    async () => {
      const result = await renderDiagramToImage(
        "graph TD\n  A[Start] --> B[End]",
      );
      if (result.error !== undefined) {
        throw new Error(`Expected a successful render: ${result.error}`);
      }

      expect(result.image.mimeType).toBe("image/png");
      expect(result.image.width).toBeGreaterThan(0);
      const { inkedPixels, inkedFractionX, inkedFractionY } =
        await decodeAndSample(exportImageToDataURL(result.image));
      expect(inkedPixels).toBeGreaterThan(0);
      // The diagram must fill the image, not sit letterboxed in a fraction
      // of it - Mermaid crops the view box to the content bar ~8px padding,
      // so a healthy render inks ~0.85+ of the canvas. (WebKit regression
      // check: it lets Mermaid's inline max-width style shrink the
      // rasterization to ~half if the renderer doesn't strip it.)
      expect(inkedFractionX).toBeGreaterThan(0.75);
      expect(inkedFractionY).toBeGreaterThan(0.75);
    },
  );

  test(
    "returns invalid Mermaid source as a typed error",
    { timeout: 15000 },
    async () => {
      // The real Mermaid parse boundary: invalid source is expected (it's
      // user input), so it comes back as a typed error rather than a throw.
      const result = await renderDiagramToImage("not a valid diagram !!");

      expect(result.error).toBeDefined();
    },
  );
});
