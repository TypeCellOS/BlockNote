import { diagramBlockMapping as pdfDiagramBlockMapping } from "@blocknote/diagram-block/pdf-exporter";
import {
  inlineMathMapping as pdfInlineMathMapping,
  mathBlockMapping as pdfMathBlockMapping,
} from "@blocknote/math-block/pdf-exporter";
import {
  PDFExporter,
  pdfDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter/react-pdf";
import { pdf } from "@react-pdf/renderer";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import { isPdf } from "@shared/util/testBytesUtil.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { browserName } from "../../utils/context.js";
import {
  invalidDiagramBlock,
  invalidMathBlock,
  removeExportFrame,
  schema,
  screenshotPdfPages,
} from "./exporterTestUtil.js";

// The deprecated react-pdf exporter's complete-export browser test. See
// exporterTestUtil.tsx for why it lives here rather than in the package.

afterEach(removeExportFrame);

describe("pdf export through a complete exporter in the browser", () => {
  // Chromium only: the produced PDF is the same file everywhere (react-pdf
  // lays it out from bundled fonts, not browser rendering), so per-browser
  // runs would only re-test pdf.js's rasterizer at 3x the suite cost.
  test.skipIf(browserName !== "chromium")(
    "renders math and diagrams to images in the produced PDF",
    { timeout: 60000 },
    async () => {
      const mappings = {
        ...pdfDefaultSchemaMappings,
        blockMapping: {
          ...pdfDefaultSchemaMappings.blockMapping,
          mathBlock: pdfMathBlockMapping,
          diagram: pdfDiagramBlockMapping,
        },
        inlineContentMapping: {
          ...pdfDefaultSchemaMappings.inlineContentMapping,
          math: pdfInlineMathMapping,
        },
      };
      // The full shared test document: unlike the email mappings, the PDF
      // exporter fetches media through `resolveFileUrl`, so the test
      // resolver keeps it deterministic and offline.
      const exporter = new PDFExporter(schema(), mappings as any, {
        resolveFileUrl: testResolveFileUrl,
      });

      const transformed = await exporter.toReactPDFDocument([
        ...testDocumentWithSourceBlocks,
        invalidDiagramBlock,
        invalidMathBlock,
      ] as any);

      // The element tree carries the inline math as an image with
      // react-pdf's async (rasterizing) src function, and the diagram as a
      // rendered PNG.
      const images: any[] = [];
      const collectImages = (node: any) => {
        if (!node || typeof node !== "object") {
          return;
        }
        if (Array.isArray(node)) {
          node.forEach(collectImages);
          return;
        }
        if (node.type === "IMAGE") {
          images.push(node);
        }
        collectImages(node.props?.children);
      };
      collectImages(transformed);
      expect(images.some((i) => typeof i.props.src === "function")).toBe(true);
      expect(
        images.some((i) => String(i.props.src).startsWith("data:image/png")),
      ).toBe(true);

      // Produce the actual file - this runs react-pdf's asset resolution,
      // which invokes the inline math's rasterizing src function.
      const blob = await pdf(transformed as any).toBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      expect(isPdf(bytes)).toBe(true);

      await screenshotPdfPages(bytes, "pdf-export-page");
    },
  );
});
