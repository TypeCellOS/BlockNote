import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { typstDefaultSchemaMappings } from "@blocknote/xl-typst-exporter";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect } from "vite-plus/test";
import {
  loadDefaultBodyFonts,
  PDFExporter,
  type PdfExporterOptions,
  type PdfExportResult,
} from "./index.js";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
  },
});

function read(p: string) {
  return new Uint8Array(readFileSync(resolve(process.cwd(), p)));
}

// Node has no URL-relative wasm loading, so the module bytes are passed
// explicitly. A minimal font set keeps the compiles fast; tests about the
// bundled defaults leave `fonts`/`emojiFont` unset instead.
const fontDir = "../../shared/assets/fonts";
let wasm: Uint8Array | undefined;
let minimalFonts: Uint8Array[] | undefined;

function readWasm() {
  return (wasm ??= read(
    "../xl-typst-compiler/pkg/blocknote_typst_wasm_bg.wasm",
  ));
}

function wasmAndFonts(): Pick<
  Partial<PdfExporterOptions>,
  "wasm" | "fonts" | "emojiFont"
> {
  return {
    wasm: readWasm(),
    fonts: (minimalFonts ??= [
      read(join(fontDir, "inter/Inter_18pt-Regular.ttf")),
      read(join(fontDir, "inter/Inter_18pt-Bold.ttf")),
    ]),
    emojiFont: [],
  };
}

const pdfTest = it
  .extend("exporter", ({ testResolveFileUrl }) => {
    return (options?: Partial<PdfExporterOptions>) =>
      new PDFExporter(schema, typstDefaultSchemaMappings, {
        resolveFileUrl: testResolveFileUrl,
        ...wasmAndFonts(),
        ...options,
      });
  })
  .extend("conforming", ({ partialBlocksToBlocksForTesting }) => {
    return partialBlocksToBlocksForTesting(schema, [
      { type: "heading", props: { level: 1 }, content: "Title" },
      { type: "paragraph", content: "Body" },
    ]);
  });

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

describe("PDFExporter", () => {
  pdfTest(
    "rejects caller assets that collide with exporter-registered ones",
    async ({ exporter, partialBlocksToBlocksForTesting }) => {
      // The document's image registers `/assets/asset-0`; a caller asset under
      // the same key would be silently shadowed by the merge, so the export
      // must fail loudly instead (before ever reaching the compiler).
      await expect(
        exporter().toPDF(
          partialBlocksToBlocksForTesting(schema, [
            {
              type: "image",
              props: { url: "https://placehold.co/60x60.png", caption: "Cap" },
            },
          ]),
          {
            assets: new Map([["/assets/asset-0", new Uint8Array([1])]]),
            lang: "en",
          },
        ),
      ).rejects.toThrow('the caller-supplied asset "/assets/asset-0" collides');
    },
  );
});

describe("PDFExporter PDF/UA declaration", () => {
  // Both tests inspect the same export, not whether exporting twice works.
  let conformingExport: Promise<PdfExportResult> | undefined;
  const conformingTest = pdfTest.extend(
    "exportConformingDocument",
    ({ exporter, conforming }) =>
      () =>
        (conformingExport ??= exporter().toPDF(conforming, {
          title: "Doc",
          lang: "en",
        })),
  );

  conformingTest(
    "declares PDF/UA-1 for a conforming document",
    async ({ exportConformingDocument }) => {
      const { bytes, pdfUA } = expectExported(await exportConformingDocument());
      expect(pdfUA).toEqual({ declared: true });
      expect(latin1(bytes)).toContain("pdfuaid");
      expect(latin1(bytes)).toContain("StructTreeRoot");
    },
  );

  pdfTest(
    "falls back to an unclaimed export for a nonconforming document",
    async ({ exporter, partialBlocksToBlocksForTesting }) => {
      // First heading is level 2: a PDF/UA-1 violation Typst catches at
      // compile time. The export still succeeds - tagged, but without the
      // conformance claim - and reports why.
      const blocks = partialBlocksToBlocksForTesting(schema, [
        { type: "heading", props: { level: 2 }, content: "Not level one" },
      ]);
      const { bytes, pdfUA } = expectExported(
        await exporter().toPDF(blocks, { title: "Doc", lang: "en" }),
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
    },
  );

  pdfTest(
    "rejects declaring without a document language (caller-args error)",
    async ({ exporter, conforming }) => {
      // A no-lang export would still carry Typst's silently defaulted
      // language (English) in the PDF - a wrong `/Lang` no validator can
      // catch. Unlike content violations, the language is an integration
      // decision only the caller can make, so this fails loudly instead of
      // quietly producing forever-unclaimed exports.
      await expect(
        exporter().toPDF(conforming, { title: "Doc" }),
      ).rejects.toThrow("requires the document's language");
      // Opting out of the claim makes the language optional again.
      const { pdfUA } = expectExported(
        await exporter().toPDF(conforming, {
          tryDeclarePdfUA: false,
          title: "Doc",
        }),
      );
      expect(pdfUA).toEqual({
        declared: false,
        reason: "tryDeclarePdfUA-disabled",
      });
    },
  );

  pdfTest(
    "skips validation and claim with tryDeclarePdfUA: false",
    async ({ exporter, conforming }) => {
      const { bytes, pdfUA } = expectExported(
        await exporter().toPDF(conforming, {
          tryDeclarePdfUA: false,
          title: "Doc",
          lang: "en",
        }),
      );
      expect(pdfUA).toEqual({
        declared: false,
        reason: "tryDeclarePdfUA-disabled",
      });
      expect(latin1(bytes)).not.toContain("pdfuaid");
      expect(latin1(bytes)).toContain("StructTreeRoot");
    },
  );

  pdfTest(
    "forwards compile warnings alongside a successful export",
    async ({ exporter, conforming }) => {
      // An unknown font family is a warning, not an error - the export
      // succeeds (Typst falls back across the loaded fonts), and the result
      // surfaces what an integrator would want to know.
      const warned = exporter({ fontFamily: "No Such Family" });
      const result = expectExported(
        await warned.toPDF(conforming, { title: "Doc", lang: "en" }),
      );
      expect(
        result.compileWarnings.some((w) =>
          w.message.includes("unknown font family"),
        ),
      ).toBe(true);
    },
  );

  it("keeps the bundled default fonts in sync with the referenced families", async ({
    partialBlocksToBlocksForTesting,
    testResolveFileUrl,
  }) => {
    // Two things can drift independently: the family-name defaults
    // (TypstExporter's fontFamily/monoFontFamily, PDFExporter's
    // emojiFontFamily) and the bundled font files in defaultFonts.ts.
    // Either drift - a renamed default or a swapped file - surfaces as an
    // `unknown font family` compile warning, so a zero-config export of a
    // document exercising body (regular/bold/italic), code, and emoji must
    // warn about nothing. (The math pairing is pinned the same way by
    // math-block's typst-exporter test.)
    const blocks = partialBlocksToBlocksForTesting(schema, [
      { type: "heading", props: { level: 1 }, content: "Title" },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "plain ", styles: {} },
          { type: "text", text: "bold ", styles: { bold: true } },
          { type: "text", text: "italic ", styles: { italic: true } },
          { type: "text", text: "emoji 😀🧑‍💻", styles: {} },
        ],
      },
      { type: "codeBlock", content: "const mono = true;" },
    ]);
    // Only the wasm is supplied (node can't URL-load it); fonts and
    // emojiFont stay unset so the real bundled defaults load.
    const zeroConfig = new PDFExporter(schema, typstDefaultSchemaMappings, {
      resolveFileUrl: testResolveFileUrl,
      wasm: readWasm(),
    });
    const result = expectExported(
      await zeroConfig.toPDF(blocks, { title: "Doc", lang: "en" }),
    );
    expect(result.compileWarnings).toEqual([]);
    expect(result.pdfUA).toEqual({ declared: true });
  });

  pdfTest(
    "extends the defaults by spreading the exported loaders",
    async ({ exporter, conforming }) => {
      // `fonts` replaces the bundled default set; extension is composition,
      // not API: spread the exported defaults and append - names and bytes
      // configured side by side in the constructor. (The appended bytes here
      // are already part of the defaults, so the compiler's dedup makes this
      // a pure wiring test.)
      const extended = exporter({
        fonts: loadDefaultBodyFonts().then((fonts) => [
          ...fonts,
          read(join(fontDir, "inter/Inter_18pt-Regular.ttf")),
        ]),
        emojiFont: undefined,
      });
      const result = expectExported(
        await extended.toPDF(conforming, { title: "Doc", lang: "en" }),
      );
      expect(latin1(result.bytes)).toContain("pdfuaid");
      expect(result.compileWarnings).toEqual([]);
    },
  );

  conformingTest(
    "carries the PDF as a Blob alongside the bytes",
    async ({ exportConformingDocument }) => {
      const result = expectExported(await exportConformingDocument());
      expect(result.blob.type).toBe("application/pdf");
      expect(result.blob.size).toBe(result.bytes.byteLength);
      // Lazily created, memoized: repeated access yields the same instance.
      expect(result.blob).toBe(result.blob);
      expect(result.pdfUA).toEqual({ declared: true });
      // The minimal test font set omits the preamble's code/emoji families,
      // which surfaces as unknown-font-family warnings - nothing else.
      expect(
        result.compileWarnings.every((w) =>
          w.message.includes("unknown font family"),
        ),
      ).toBe(true);
    },
  );

  pdfTest(
    "reports compile failures as a typed error, not as violations",
    async ({ exporter, conforming }) => {
      // Broken raw markup (here via the caller-supplied header) is a compile
      // failure - an expected outcome carried in the result, distinct from
      // conformance violations (it must not degrade to an unclaimed export).
      const result = await exporter().toPDF(conforming, {
        title: "Doc",
        lang: "en",
        header: "#thisFunctionDoesNotExist()",
      });
      expect(result.error).toBe("compile-failed");
      if (result.error) {
        expect(result.compileErrors.length).toBeGreaterThan(0);
      }
    },
  );
});
