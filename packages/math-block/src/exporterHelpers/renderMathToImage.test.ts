import { exportImageToDataURL } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { latexToMathSVG } from "./renderMathToImage.js";

describe("latexToMathSVG", () => {
  it("converts LaTeX to a sized SVG image", () => {
    const result = latexToMathSVG("e^{i\\pi} + 1 = 0", {
      inline: true,
      fontSize: 16,
    });

    if (result.error !== undefined) {
      throw new Error(`Expected a successful conversion: ${result.error}`);
    }
    expect(result.image.mimeType).toBe("image/svg+xml");
    expect(result.image.width).toBeGreaterThan(0);
    expect(result.image.height).toBeGreaterThan(0);
    expect(new TextDecoder().decode(result.image.data)).toMatch(/^<svg/);
  });

  it("returns invalid LaTeX as a typed error", () => {
    const result = latexToMathSVG("\\invalidcommand{", {
      inline: true,
      fontSize: 16,
    });

    expect(result.error).toBeDefined();
  });

  it("sets the SVG's intrinsic dimensions to the display size", () => {
    const result = latexToMathSVG("e^{i\\pi} + 1 = 0", {
      inline: true,
      fontSize: 16,
    });

    if (result.error !== undefined) {
      throw new Error(`Expected a successful conversion: ${result.error}`);
    }
    const svg = new TextDecoder().decode(result.image.data);
    // MathJax's `ex`-based dimensions must be replaced with explicit ones,
    // or renderers fall back to a default size.
    expect(svg).toContain(`width="${Math.ceil(result.image.width)}"`);
    expect(svg).toContain(`height="${Math.ceil(result.image.height)}"`);
    expect(svg).not.toMatch(/width="[\d.]+ex"/);
    expect(svg).not.toMatch(/height="[\d.]+ex"/);
  });

  it("round-trips through exportImageToDataURL", () => {
    const result = latexToMathSVG("e^{i\\pi} + 1 = 0", {
      inline: true,
      fontSize: 16,
    });

    if (result.error !== undefined) {
      throw new Error(`Expected a successful conversion: ${result.error}`);
    }
    const dataURL = exportImageToDataURL(result.image);
    expect(dataURL).toMatch(/^data:image\/svg\+xml;base64,/);
    const bytes = Uint8Array.from(atob(dataURL.split(",")[1]), (char) =>
      char.charCodeAt(0),
    );
    expect(new TextDecoder().decode(bytes)).toBe(
      new TextDecoder().decode(result.image.data),
    );
  });
});
