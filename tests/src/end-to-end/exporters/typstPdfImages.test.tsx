import { diagramBlockMapping as typstDiagramBlockMapping } from "@blocknote/diagram-block/typst-exporter";
import {
  inlineMathMapping as typstInlineMathMapping,
  mathBlockMapping as typstMathBlockMapping,
} from "@blocknote/math-block/typst-exporter";
import {
  compileTypstToPdf,
  DEFAULT_EMOJI_FONT_FAMILY,
  loadDefaultBodyFonts,
  loadDefaultEmojiFont,
  TypstExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
// Bundled wasm so the Typst compile below runs fully offline. The fonts come
// from the package's own default loaders (not a hand-copied list, which can
// drift): a missing *face* (bold/italic) or the mono family falls back
// silently, which would render styled text and code unstyled and leave that
// fidelity untested - here the baselines pin exactly what a zero-config
// export ships.
// eslint-disable-next-line import/no-unresolved
import compilerWasmUrl from "@blocknote/xl-typst-compiler/wasm?url";
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

// See exporterTestUtil.tsx for why the complete-export browser tests live
// here rather than in the exporter packages.

afterEach(removeExportFrame);

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
    {
      resolveFileUrl: testResolveFileUrl,
      // As PDFExporter declares by default, so multi-codepoint emoji (skin
      // tones, ZWJ sequences) shape through the emoji font instead of
      // relying on Typst's per-glyph fallback.
      emojiFontFamily: DEFAULT_EMOJI_FONT_FAMILY,
    },
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

  const result = await compileTypstToPdf(typ, {
    wasm: new URL(compilerWasmUrl, document.baseURI),
    fonts: await loadDefaultBodyFonts(),
    emojiFont: await loadDefaultEmojiFont(),
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

  // Chromium only, like the react-pdf visual test: the PDF is the same
  // bytes everywhere (Typst lays it out from the supplied fonts, not
  // browser rendering), so per-browser runs would only re-test pdf.js's
  // rasterizer at 3x the suite cost.
  test.skipIf(browserName !== "chromium")(
    "matches the per-page visual snapshot",
    // Cold wasm load + compile + rasterizing every page needs more headroom
    // than the other tests on shared CI runners.
    { timeout: 120000 },
    async () => {
      const { pdf } = await compileTypstUaPdf();

      // Deterministic input (fixed creationTimestamp) + a pinned renderer
      // make these pages byte-stable, so the comparison can be much tighter
      // than the suite default - which, at 2% of an A4 page, once absorbed
      // a full bold/italic styling regression.
      await screenshotPdfPages(pdf, "typst-pdf-page", {
        comparatorOptions: { allowedMismatchedPixelRatio: 0.002 },
      });
    },
  );
});
