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
import { diagramBlockMapping as typstDiagramBlockMapping } from "@blocknote/diagram-block/typst-exporter";
import {
  inlineMathMapping as typstInlineMathMapping,
  mathBlockMapping as typstMathBlockMapping,
} from "@blocknote/math-block/typst-exporter";
import {
  ReactEmailExporter,
  reactEmailDefaultSchemaMappings,
} from "@blocknote/xl-email-exporter";
import {
  compileTypstToPdf,
  TypstExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
// Bundled wasm + fonts so the Typst compile below runs fully offline.
// eslint-disable-next-line import/no-unresolved
import compilerWasmUrl from "@blocknote/xl-typst-compiler/wasm?url";
// eslint-disable-next-line import/no-unresolved
import interRegularUrl from "@shared/assets/fonts/inter/Inter_18pt-Regular.ttf?url";
// Typst needs a math-capable font for equations and an emoji font for the
// document's emoji (the compiler ships no fonts; missing glyphs would fail
// PDF/UA-1 validation as `.notdef`).
import newCMMathBookUrl from "@shared/assets/fonts/newcm/NewCMMath-Book.otf?url";
import newCMMathRegularUrl from "@shared/assets/fonts/newcm/NewCMMath-Regular.otf?url";
import notoEmojiUrl from "@shared/assets/fonts/noto/Noto-COLRv1.ttf?url";
import {
  PDFExporter,
  pdfDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter/react-pdf";
import { pdf } from "@react-pdf/renderer";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import { decodeAndSample } from "@shared/util/browserImageTestUtil.js";
import { isPdf } from "@shared/util/testBytesUtil.js";
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

// Builds the exporter, converts the shared document (plus invalid math /
// diagram placeholders), and compiles it natively as PDF/UA-1 through the
// real wasm pipeline. Shared by the assertion test and the visual test.
async function compileTypstUaPdf() {
  const typstDocument = [
    ...testDocumentWithSourceBlocks,
    invalidDiagramBlock,
    invalidMathBlock,
  ];

  const exporter = new TypstExporter(
    schema(),
    {
      ...typstDefaultSchemaMappings,
      blockMapping: {
        ...typstDefaultSchemaMappings.blockMapping,
        mathBlock: typstMathBlockMapping,
        diagram: typstDiagramBlockMapping,
      },
      inlineContentMapping: {
        ...typstDefaultSchemaMappings.inlineContentMapping,
        math: typstInlineMathMapping,
      },
    } as any,
    { resolveFileUrl: testResolveFileUrl },
  );

  const typ = await exporter.toTypst(
    typstDocument as any,
    {
      title: "BlockNote Export",
      lang: "en",
      // Fixed timestamp: the visual baselines rely on deterministic bytes.
      creationTimestamp: 1_700_000_000,
    } as any,
  );

  const fonts = await Promise.all(
    [interRegularUrl, newCMMathRegularUrl, newCMMathBookUrl, notoEmojiUrl].map(
      async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer()),
    ),
  );
  const result = await compileTypstToPdf(typ, {
    wasm: new URL(compilerWasmUrl, document.baseURI),
    fonts,
    assets: exporter.assetFiles,
    pdfStandard: "ua-1",
    creationTimestamp: 1_700_000_000,
  });
  if (result.error) {
    throw new Error(result.compileErrors.map((d) => d.message).join(" | "));
  }
  return { typ, exporter, pdf: result.pdf };
}

describe("pdf/ua export through the complete typst pipeline in the browser", () => {
  test(
    "exports the shared document with math and diagrams",
    { timeout: 60000 },
    async () => {
      // Compiling through the real wasm pipeline is what only the browser
      // suite covers: bundler-served wasm loading (the node unit suites
      // drive the same wasm from bytes).
      const { typ, exporter, pdf } = await compileTypstUaPdf();

      // Native equations with the LaTeX source as alt text, the diagram as a
      // figure with the Mermaid source as alt text - and the invalid sources
      // as placeholders, without failing the export.
      expect(typ).toContain("math.equation(block: true");
      expect(typ).toContain('alt: "a^2 = \\\\sqrt{b^2 + c^2}"');
      expect(typ).toContain("Invalid diagram");
      expect(typ).toContain("Invalid formula");

      // The default browser renderer produced a real Mermaid render as
      // vector SVG, and the document's images resolved to registered assets.
      // (Asset paths are extension-less; identify the formats by bytes.)
      const assetBytes = [...exporter.assetFiles.values()];
      expect(
        assetBytes.some((b) =>
          new TextDecoder().decode(b.slice(0, 5)).startsWith("<svg"),
        ),
      ).toBe(true);
      expect(assetBytes.some((b) => b[0] === 0xff && b[1] === 0xd8)).toBe(true);

      expect(isPdf(pdf)).toBe(true);
      expect(pdf.byteLength).toBeGreaterThan(10_000);
      // Natively declared and validated by the compile itself.
      expect(new TextDecoder("latin1").decode(pdf).includes("pdfuaid")).toBe(
        true,
      );
    },
  );

  // Chromium only, like the react-pdf visual test below: the PDF is the
  // same bytes everywhere (Typst lays it out from the supplied fonts, not
  // browser rendering), so per-browser runs would only re-test pdf.js's
  // rasterizer at 3x the suite cost.
  test.skipIf(browserName !== "chromium")(
    "matches the per-page visual snapshot",
    // Cold wasm load + compile + rasterizing every page needs more headroom
    // than the other tests on shared CI runners.
    { timeout: 120000 },
    async () => {
      const { pdf } = await compileTypstUaPdf();

      // Render the produced PDF's pages with pdf.js and screenshot each
      // page as a visual regression of the actual export (the same
      // approach as the react-pdf test below).
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = (
        await import("pdfjs-dist/build/pdf.worker.min.mjs?url" as string)
      ).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

      const parsed = await pdfjs.getDocument({ data: pdf.slice() }).promise;
      // The test document contains a page break.
      expect(parsed.numPages).toBeGreaterThanOrEqual(2);

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
        await screenshotFull(frame, `typst-pdf-page-${n}`);
      }
    },
  );
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
      expect(isPdf(bytes)).toBe(true);

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
