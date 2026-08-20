import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { diagramBlockMapping as emailDiagramBlockMapping } from "@blocknote/diagram-block/email-exporter";
import { diagramBlockMapping as pdfDiagramBlockMapping } from "@blocknote/diagram-block/pdf-exporter";
import {
  inlineMathMapping as emailInlineMathMapping,
  mathBlockMapping as emailMathBlockMapping,
} from "@blocknote/math-block/email-exporter";
import {
  inlineMathMapping as pdfInlineMathMapping,
  mathBlockMapping as pdfMathBlockMapping,
} from "@blocknote/math-block/pdf-exporter";
import {
  ReactEmailExporter,
  reactEmailDefaultSchemaMappings,
} from "@blocknote/xl-email-exporter";
import {
  PDFExporter,
  pdfDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
import { pdf } from "@react-pdf/renderer";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import { decodeAndSample } from "@shared/util/browserImageTestUtil.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { browserName } from "../../utils/context.js";
import { screenshotFull } from "../../utils/screenshotFull.js";

// Complete exports of the full shared test document with the default
// mappings in a real browser, where the mappings' `typeof document` checks
// select the built-in image implementations. These are the only tests of
// that composition - the packages' (node) unit suites always take the
// headless side of those checks (or plug in stubs), and the colocated
// `.browser.test` files call the implementations directly, bypassing the
// mappings. A broken default wiring or inverted environment check passes
// every one of those tests and only fails here - while breaking the primary
// real-world path, exporting from the browser. Lives in this package because
// it spans math-block, diagram-block and the exporters, and this is the
// repo's only browser-mode runner.

// An invalid diagram and an invalid formula, whose typed errors must render
// as placeholders without failing the export. Unlike the packages' node
// suites, this exercises the real error classes through vite's
// bundling/interop of mermaid and mathjax-full - e.g. a mis-resolved
// `TexError` import only breaks here (and in real apps), not in node.
const invalidDiagramBlock = {
  id: "invalid-diagram",
  type: "diagram",
  props: {},
  content: [{ type: "text", text: "not a valid diagram !!", styles: {} }],
  children: [],
} as any;
const invalidMathBlock = {
  id: "invalid-math",
  type: "mathBlock",
  props: {},
  // A structural error: MathJax's `noundefined` package renders unknown
  // commands as text rather than erroring, so an unknown command wouldn't
  // reach the error path.
  content: [{ type: "text", text: "\\frac{1}{", styles: {} }],
  children: [],
} as any;

const schema = () => BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs });

afterEach(() => {
  document.getElementById("export-under-test")?.remove();
});

// Creates the container the export under test is rendered into (removed
// again by the afterEach above).
function createExportFrame(width: string) {
  const frame = document.createElement("div");
  frame.id = "export-under-test";
  frame.style.width = width;
  frame.style.background = "white";
  document.body.append(frame);
  return frame;
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
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");

      // Render the produced PDF's pages with pdf.js (pure JS - the reason
      // the old Node-side attempt at this failed was native canvas
      // dependencies, which a real browser doesn't need) and screenshot
      // them, stacked, as a visual regression of the actual export.
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = (
        await import("pdfjs-dist/build/pdf.worker.min.mjs?url" as string)
      ).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

      const parsed = await pdfjs.getDocument({ data: bytes }).promise;
      // The test document contains a page break.
      expect(parsed.numPages).toBeGreaterThanOrEqual(2);

      // Screenshot each page as its own full-resolution baseline.
      const frame = createExportFrame("fit-content");
      for (let n = 1; n <= parsed.numPages; n++) {
        const pdfPage = await parsed.getPage(n);
        const viewport = pdfPage.getViewport({ scale: 1 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = "block";
        await pdfPage.render({
          canvasContext: canvas.getContext("2d")!,
          viewport,
        } as any).promise;
        frame.replaceChildren(canvas);
        await screenshotFull(frame, `pdf-export-page-${n}`);
      }
    },
  );
});
