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
import { decodeAndSample } from "@shared/util/browserImageTestUtil.js";
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

    // Three generated images: block math (rasterized to PNG in the
    // browser), inline math (always SVG), and the valid diagram (PNG). The
    // invalid diagram renders the error placeholder instead - and doesn't
    // fail the export.
    // Decodes the HTML-escaped attribute value; `&amp;` must be decoded
    // last - decoding it first would double-unescape sequences like
    // `&amp;#x27;` (an escaped literal `&#x27;`) into `'`.
    const srcs = [...html.matchAll(/<img[^>]*src="(data:[^"]+)"/g)].map(
      (match) => match[1].replaceAll("&#x27;", "'").replaceAll("&amp;", "&"),
    );
    expect(srcs).toHaveLength(3);
    expect(srcs[0]).toMatch(/^data:image\/png/);
    expect(srcs[1]).toMatch(/^data:image\/svg\+xml/);
    expect(srcs[2]).toMatch(/^data:image\/png/);
    for (const src of srcs) {
      expect((await decodeAndSample(src)).inkedPixels).toBeGreaterThan(0);
    }
    expect(html).toContain("Invalid diagram");
    expect(html).toContain("Invalid formula");

    // Visual regression of the exported email as a client would show it,
    // rendered at 600px (typical email client width).
    const frame = createExportFrame("600px");
    frame.innerHTML = html;
    // Wait until every image is ready to paint - a screenshot taken while a
    // data: URL is still decoding captures a gap (and unloaded images throw
    // off the height measurement in screenshotFull).
    await Promise.all(
      [...frame.querySelectorAll("img")].map((img) => img.decode()),
    );
    await screenshotFull(frame, "email-export");
  });
});
