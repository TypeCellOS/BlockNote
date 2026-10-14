import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { PDFDict, PDFDocument, PDFName } from "@cantoo/pdf-lib";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { testDocument } from "@shared/testDocument.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import { compileTypstForTesting } from "@shared/util/typstTestUtil.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import {
  TypstExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-typst-exporter";

// The fonts the exporter references (Inter 18pt + Geist Mono), from the shared
// assets, plus a color emoji font (Noto Color Emoji, pure-COLRv1) so emoji
// render in color rather than as `.notdef` — matching the example.
function fontBlobs(): Uint8Array[] {
  const shared = "../../shared/assets/fonts";
  const paths = [
    `${shared}/inter/Inter_18pt-Regular.ttf`,
    `${shared}/inter/Inter_18pt-Italic.ttf`,
    `${shared}/inter/Inter_18pt-Bold.ttf`,
    `${shared}/inter/Inter_18pt-BoldItalic.ttf`,
    `${shared}/GeistMono-Regular.ttf`,
    `${shared}/noto/Noto-COLRv1.ttf`,
  ];
  return paths.map(
    (p) => new Uint8Array(readFileSync(resolve(process.cwd(), p))),
  );
}

// Compiles the shared test document (with the network-free test image
// resolver) natively as PDF/UA-1 and asserts the structural essentials.
//
// Conformance itself is validated *during* the compile: requesting the
// `ua-1` standard makes Typst/krilla check the document (heading structure,
// alt text, title, ...) and refuse to emit a nonconforming PDF — so a
// successful compile IS the conformance statement, guaranteed by the
// engine rather than re-verified here. (Independent verification with
// veraPDF — `verapdf --flavour ua1` — remains a manual option; the
// declared output has been validated against it: 0 failed checks.)
//
// Visual regression of the rendered pages lives in the browser e2e suite
// (tests/src/end-to-end/exporters/exporterImages.test.tsx), which
// rasterizes the produced PDF with pdf.js and screenshots each page.
describe("pdf/ua-1: BlockNote -> Typst -> PDF", () => {
  let ua: Uint8Array;

  beforeAll(async () => {
    const exporter = new TypstExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
          column: ColumnBlock,
          columnList: ColumnListBlock,
        },
      }),
      typstDefaultSchemaMappings,
      // List the color emoji font explicitly so ZWJ emoji shape correctly (the
      // font bytes are loaded via fontBlobs()); the shared test resolver keeps
      // the render deterministic and network-free.
      {
        emojiFontFamily: "Noto Color Emoji",
        resolveFileUrl: testResolveFileUrl,
      },
    );
    const typ = await exporter.toTypst(testDocument, {
      title: "BlockNote Export",
      lang: "en",
      author: "BlockNote",
    });

    ua = await compileTypstForTesting(typ, {
      assets: exporter.assetFiles,
      fontBlobs: fontBlobs(),
      creationTimestamp: 1_700_000_000,
      pdfStandard: "ua-1",
    });
  }, 30000);

  it("produces a declared, structurally-tagged document", async () => {
    // The conformance claim in the XMP metadata.
    expect(new TextDecoder("latin1").decode(ua)).toContain("pdfuaid");

    // Structure that lives in compressed objects, via a real PDF parser:
    // the tag tree root and the DisplayDocTitle viewer preference PDF/UA
    // requires.
    const doc = await PDFDocument.load(ua, { updateMetadata: false });
    expect(doc.catalog.get(PDFName.of("StructTreeRoot"))).toBeDefined();
    const vp = doc.catalog.lookup(PDFName.of("ViewerPreferences"), PDFDict);
    expect(String(vp!.get(PDFName.of("DisplayDocTitle")))).toBe("true");
  });

  it("carries the fixed creation timestamp (deterministic output)", () => {
    // Byte-reproducible output is what the e2e visual baselines rely on.
    expect(new TextDecoder("latin1").decode(ua)).toContain("2023-11-14");
  });
});
