import { diagramBlockMapping as emailDiagramBlockMapping } from "@blocknote/diagram-block/email-exporter";
import {
  inlineMathMapping as emailInlineMathMapping,
  mathBlockMapping as emailMathBlockMapping,
} from "@blocknote/math-block/email-exporter";
import {
  ReactEmailExporter,
  reactEmailDefaultSchemaMappings,
} from "@blocknote/xl-email-exporter";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { screenshotFull } from "../../utils/screenshotFull.js";
import {
  createExportFrame,
  invalidDiagramBlock,
  invalidMathBlock,
  removeExportFrame,
  schema,
} from "./exporterTestUtil.js";

// See exporterTestUtil.tsx for why the complete-export browser tests live
// here rather than in the exporter packages.

afterEach(removeExportFrame);

function hasPaintedPixels(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Missing 2D canvas context");
  }
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let alpha = 3; alpha < pixels.length; alpha += 4) {
    if (pixels[alpha] > 0) {
      return true;
    }
  }
  return false;
}

describe("email export through a complete exporter in the browser", () => {
  test("renders math and diagrams to images", { timeout: 30000 }, async () => {
    // The full shared test document, minus the media blocks: the email
    // mappings embed media by their (remote) URLs directly, which the
    // screenshot below would then try to load over the network.
    const emailDocument = [
      ...testDocumentWithSourceBlocks.filter(
        (block) => !["image", "video", "audio", "file"].includes(block.type),
      ),
      invalidDiagramBlock,
      invalidMathBlock,
    ];

    const exporter = new ReactEmailExporter(schema(), {
      ...reactEmailDefaultSchemaMappings,
      blockMapping: {
        ...reactEmailDefaultSchemaMappings.blockMapping,
        mathBlock: emailMathBlockMapping,
        diagram: emailDiagramBlockMapping,
      },
      inlineContentMapping: {
        ...reactEmailDefaultSchemaMappings.inlineContentMapping,
        math: emailInlineMathMapping,
      },
    } as any);

    const html = await exporter.toReactEmailDocument(emailDocument as any);

    // Render the email as a client would show it, at a typical client width.
    const frame = createExportFrame("600px");
    frame.innerHTML = html;
    const images = [...frame.querySelectorAll("img")];

    // Three generated images: block math (rasterized to PNG in the
    // browser), inline math (always SVG), and the valid diagram (PNG). The
    // invalid diagram renders the error placeholder instead - and doesn't
    // fail the export.
    expect(images).toHaveLength(3);
    expect(images[0].src).toMatch(/^data:image\/png/);
    expect(images[1].src).toMatch(/^data:image\/svg\+xml/);
    expect(images[2].src).toMatch(/^data:image\/png/);
    expect(html).toContain("Invalid diagram");
    expect(html).toContain("Invalid formula");

    // Decode the actual email images once, for both the pixel checks and the
    // screenshot. Unloaded images also throw off its height measurement.
    await Promise.all(images.map((image) => image.decode()));
    for (const image of images) {
      expect(hasPaintedPixels(image), `Image ${image.alt} is blank`).toBe(true);
    }
    await screenshotFull(frame, "email-export");
  });
});
