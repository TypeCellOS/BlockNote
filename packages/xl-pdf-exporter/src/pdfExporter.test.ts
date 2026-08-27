import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { typstDefaultSchemaMappings } from "@blocknote/xl-typst-exporter";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import {
  PDFExporter,
  type PdfExportOptions,
  type PdfExportResult,
} from "./index.js";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
  },
});

describe("PDFExporter", () => {
  it("rejects caller assets that collide with exporter-registered ones", async () => {
    const exporter = new PDFExporter(schema, typstDefaultSchemaMappings, {
      resolveFileUrl: testResolveFileUrl,
    });

    // The document's image registers `/assets/asset-0`; a caller asset under
    // the same key would be silently shadowed by the merge, so the export
    // must fail loudly instead (before ever reaching the compiler).
    await expect(
      exporter.toPDF(
        partialBlocksToBlocksForTesting(schema, [
          {
            type: "image",
            props: { url: "https://placehold.co/60x60.png", caption: "Cap" },
          },
        ]),
        { assets: new Map([["/assets/asset-0", new Uint8Array([1])]]) },
      ),
    ).rejects.toThrow('the caller-supplied asset "/assets/asset-0" collides');
  });
});

// Node has no URL-relative wasm loading, so the module bytes and fonts are
// passed explicitly (the zero-config defaults - bundled fonts, wasm from
// package files - are browser paths, covered by the browser/e2e suites).
function wasmAndFonts(): Pick<
  PdfExportOptions,
  "wasm" | "fonts" | "emojiFont"
> {
  const read = (p: string) =>
    new Uint8Array(readFileSync(resolve(process.cwd(), p)));
  const fontDir = "../../shared/assets/fonts";
  return {
    wasm: read("../xl-typst-compiler/pkg/blocknote_typst_wasm_bg.wasm"),
    fonts: [
      read(join(fontDir, "inter/Inter_18pt-Regular.ttf")),
      read(join(fontDir, "inter/Inter_18pt-Bold.ttf")),
    ],
    emojiFont: [],
  };
}

const latin1 = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

function expectExported(
  result: PdfExportResult,
): Extract<PdfExportResult, { error?: undefined }> {
  if (result.error) {
    throw new Error(
      `expected an export, got: ${result.compileErrors
        .map((d) => d.message)
        .join(" | ")}`,
    );
  }
  return result;
}

describe("PDFExporter PDF/UA declaration", () => {
  function exporter() {
    return new PDFExporter(schema, typstDefaultSchemaMappings, {
      resolveFileUrl: testResolveFileUrl,
    });
  }
  const conforming = () =>
    partialBlocksToBlocksForTesting(schema, [
      { type: "heading", props: { level: 1 }, content: "Title" },
      { type: "paragraph", content: "Body" },
    ]);

  it("declares PDF/UA-1 for a conforming document", async () => {
    const { bytes, pdfUA } = expectExported(
      await exporter().toPDF(conforming(), wasmAndFonts(), {
        title: "Doc",
        lang: "en",
      }),
    );
    expect(pdfUA).toEqual({ declared: true });
    expect(latin1(bytes)).toContain("pdfuaid");
    expect(latin1(bytes)).toContain("StructTreeRoot");
  });

  it("falls back to an unclaimed export for a nonconforming document", async () => {
    // First heading is level 2: a PDF/UA-1 violation Typst catches at
    // compile time. The export still succeeds - tagged, but without the
    // conformance claim - and reports why.
    const blocks = partialBlocksToBlocksForTesting(schema, [
      { type: "heading", props: { level: 2 }, content: "Not level one" },
    ]);
    const { bytes, pdfUA } = expectExported(
      await exporter().toPDF(blocks, wasmAndFonts(), {
        title: "Doc",
        lang: "en",
      }),
    );
    expect(pdfUA.declared).toBe(false);
    if (!pdfUA.declared && pdfUA.reason === "nonconforming") {
      expect(pdfUA.violations.length).toBeGreaterThan(0);
      expect(pdfUA.violations[0].message).toContain(
        "first heading must be of level 1",
      );
    } else {
      throw new Error(`unexpected pdfUA result: ${JSON.stringify(pdfUA)}`);
    }
    expect(latin1(bytes)).not.toContain("pdfuaid");
    expect(latin1(bytes)).toContain("StructTreeRoot");
  });

  it("rejects declaring without a document language (caller-args error)", async () => {
    // A no-lang export would still carry Typst's silently defaulted
    // language (English) in the PDF - a wrong `/Lang` no validator can
    // catch. Unlike content violations, the language is an integration
    // decision only the caller can make, so this fails loudly instead of
    // quietly producing forever-unclaimed exports.
    await expect(
      exporter().toPDF(conforming(), wasmAndFonts(), { title: "Doc" }),
    ).rejects.toThrow("requires the document's language");
    // Opting out of the claim makes the language optional again.
    const { pdfUA } = expectExported(
      await exporter().toPDF(
        conforming(),
        { ...wasmAndFonts(), tryDeclarePdfUA: false },
        { title: "Doc" },
      ),
    );
    expect(pdfUA).toEqual({
      declared: false,
      reason: "tryDeclarePdfUA-disabled",
    });
  });

  it("skips validation and claim with tryDeclarePdfUA: false", async () => {
    const { bytes, pdfUA } = expectExported(
      await exporter().toPDF(
        conforming(),
        { ...wasmAndFonts(), tryDeclarePdfUA: false },
        { title: "Doc", lang: "en" },
      ),
    );
    expect(pdfUA).toEqual({
      declared: false,
      reason: "tryDeclarePdfUA-disabled",
    });
    expect(latin1(bytes)).not.toContain("pdfuaid");
    expect(latin1(bytes)).toContain("StructTreeRoot");
  });

  it("forwards compile warnings alongside a successful export", async () => {
    // An unknown font family is a warning, not an error - the export
    // succeeds (Typst falls back across the loaded fonts), and the result
    // surfaces what an integrator would want to know.
    const warned = new PDFExporter(schema, typstDefaultSchemaMappings, {
      resolveFileUrl: testResolveFileUrl,
      fontFamily: "No Such Family",
    });
    const result = expectExported(
      await warned.toPDF(conforming(), wasmAndFonts(), {
        title: "Doc",
        lang: "en",
      }),
    );
    expect(
      result.compileWarnings.some((w) =>
        w.message.includes("unknown font family"),
      ),
    ).toBe(true);
  });

  it("carries the PDF as a Blob alongside the bytes", async () => {
    const result = await exporter().toPDF(conforming(), wasmAndFonts(), {
      title: "Doc",
      lang: "en",
    });
    if (result.error) {
      throw new Error(result.compileErrors.map((d) => d.message).join(" | "));
    }
    expect(result.blob.type).toBe("application/pdf");
    expect(result.blob.size).toBe(result.bytes.byteLength);
    expect(result.pdfUA).toEqual({ declared: true });
    // The minimal test font set omits the preamble's code/emoji families,
    // which surfaces as unknown-font-family warnings - nothing else.
    expect(
      result.compileWarnings.every((w) =>
        w.message.includes("unknown font family"),
      ),
    ).toBe(true);
  });

  it("reports compile failures as a typed error, not as violations", async () => {
    // Broken raw markup (here via the caller-supplied header) is a compile
    // failure - an expected outcome carried in the result, distinct from
    // conformance violations (it must not degrade to an unclaimed export).
    const result = await exporter().toPDF(conforming(), wasmAndFonts(), {
      title: "Doc",
      lang: "en",
      header: "#thisFunctionDoesNotExist()",
    });
    expect(result.error).toBe("compile-failed");
    if (result.error) {
      expect(result.compileErrors.length).toBeGreaterThan(0);
    }
  });
});
