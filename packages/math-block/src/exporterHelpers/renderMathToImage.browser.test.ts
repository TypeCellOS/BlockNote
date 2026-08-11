import { exportImageToDataURL } from "@blocknote/core";
import { decodeAndSample } from "@shared/util/browserImageTestUtil.js";
import { describe, expect, test } from "vite-plus/test";

import { latexToMathSVG, rasterizeSVGInBrowser } from "./renderMathToImage.js";

// Browser unit tests for the browser-only rasterizer - the `RasterizeSVG`
// implementation that the (node) unit suites replace with stubs. Runs in the
// tests package's browser suite.
describe("rasterizeSVGInBrowser", () => {
  test("rasterizes at the requested scale", async () => {
    const result = latexToMathSVG("a^2 = \\sqrt{b^2 + c^2}", {
      inline: false,
      fontSize: 16,
    });
    if (result.error !== undefined) {
      throw new Error(`Expected a successful conversion: ${result.error}`);
    }

    const raster = await rasterizeSVGInBrowser(result.image, 3);

    expect(raster.mimeType).toBe("image/png");
    // The raster keeps the display dimensions; the pixel data is scaled.
    expect(raster.width).toBe(result.image.width);
    expect(raster.height).toBe(result.image.height);
    const { width, height, inkedPixels } = await decodeAndSample(
      exportImageToDataURL(raster),
    );
    expect(width).toBeGreaterThanOrEqual(Math.floor(raster.width * 3));
    expect(height).toBeGreaterThanOrEqual(Math.floor(raster.height * 3));
    expect(inkedPixels).toBeGreaterThan(0);
  });
});
