import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import {
  TypstCompiler,
  isPdfStandardViolation,
  type CompilePdfResult,
} from "./index.js";

const pkgDir = join(__dirname, "..");
const fontDir = join(pkgDir, "..", "..", "shared", "assets", "fonts");

function font(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fontDir, rel)));
}

// Node has no URL-relative wasm loading from the test runner, so the module
// bytes are passed explicitly (the browser path is covered by the tests
// package's e2e suite, which exercises URL loading through a bundler).
const wasmBytes = new Uint8Array(
  readFileSync(join(pkgDir, "pkg", "blocknote_typst_wasm_bg.wasm")),
);

const latin1 = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);
const isPdf = (bytes: Uint8Array) => latin1(bytes.slice(0, 5)) === "%PDF-";

// A 1x1 red PNG.
const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

function expectPdf(
  result: CompilePdfResult,
): Extract<CompilePdfResult, { error?: undefined }> {
  if (result.error) {
    throw new Error(
      `expected a PDF, got errors: ${result.compileErrors
        .map((d) => d.message)
        .join(" | ")}`,
    );
  }
  return result;
}

let compiler: TypstCompiler;

beforeAll(async () => {
  compiler = await TypstCompiler.create({
    wasm: wasmBytes,
    fonts: [
      font("inter/Inter_18pt-Regular.ttf"),
      font("inter/Inter_18pt-Bold.ttf"),
      font("newcm/NewCMMath-Regular.otf"),
      font("newcm/NewCMMath-Book.otf"),
    ],
  });
});

const preamble = `#set document(title: [Test])\n#set text(font: "Inter 18pt", lang: "en")\n`;
const conforming = `${preamble}= Heading
Body with math #math.equation(alt: "a squared", $a^2$).
#figure(image("/assets/dot.png", width: 10pt, alt: "A red dot"), caption: [A dot])
`;
const assets = new Map([["/assets/dot.png", png]]);

describe("compilePdf", () => {
  it("compiles markup with fonts, math, and image assets to a PDF", () => {
    const { pdf, compileWarnings } = expectPdf(
      compiler.compilePdf(conforming, { assets }),
    );
    expect(isPdf(pdf)).toBe(true);
    expect(compileWarnings).toEqual([]);
    // Tagged by default, but no conformance claim without a standard.
    expect(latin1(pdf)).toContain("StructTreeRoot");
    expect(latin1(pdf)).not.toContain("pdfuaid");
  });

  it("can disable tagging", () => {
    const { pdf } = expectPdf(
      compiler.compilePdf(conforming, { assets, tagged: false }),
    );
    expect(latin1(pdf)).not.toContain("StructTreeRoot");
  });

  it("returns typed diagnostics for invalid markup", () => {
    const result = compiler.compilePdf(`${preamble}#broken(`);
    expect(result.error).toBe("compile-failed");
    if (result.error) {
      expect(result.compileErrors.length).toBeGreaterThan(0);
      expect(result.compileErrors.some((d) => isPdfStandardViolation(d))).toBe(
        false,
      );
    }
  });

  it("fails loudly when a needed font is missing (no embedded fonts)", async () => {
    const fontless = await TypstCompiler.create();
    const result = fontless.compilePdf(`$x$`);
    expect(result.error).toBe("compile-failed");
    if (result.error) {
      expect(result.compileErrors[0].message).toContain(
        "no font could be found",
      );
    }
  });

  it("surfaces compile warnings alongside the produced PDF", () => {
    const { pdf, compileWarnings } = expectPdf(
      compiler.compilePdf(
        `${preamble}#set text(font: "No Such Family")\nHello`,
      ),
    );
    expect(isPdf(pdf)).toBe(true);
    expect(
      compileWarnings.some((w) => w.message.includes("unknown font family")),
    ).toBe(true);
  });

  it("carries warnings on the failure branch too", () => {
    // A document can accumulate warnings before hitting a hard error; the
    // failure result keeps both, so callers don't lose context. (The error
    // must occur past parsing - a parse error aborts before the stages
    // that produce warnings.)
    const result = compiler.compilePdf(
      `${preamble}#set text(font: "No Such Family")\nHello\n#image("/nope.png")`,
    );
    expect(result.error).toBe("compile-failed");
    if (result.error) {
      expect(result.compileErrors.length).toBeGreaterThan(0);
      expect(
        result.compileWarnings.some((w) =>
          w.message.includes("unknown font family"),
        ),
      ).toBe(true);
    }
  });

  it("throws (not a typed failure) for invalid caller options", () => {
    // An unknown PDF standard is a caller mistake, not an expected
    // document-driven outcome - it must not masquerade as a compile
    // failure.
    expect(() =>
      compiler.compilePdf(`${preamble}Hello`, { pdfStandard: "bogus" }),
    ).toThrow();
  });

  it("supports importable .typ assets", () => {
    const result = expectPdf(
      compiler.compilePdf(`${preamble}#import "/lib.typ": shout\n#shout[hi]`, {
        assets: new Map([
          [
            "/lib.typ",
            new TextEncoder().encode(`#let shout(body) = [#upper(body)!]`),
          ],
        ]),
      }),
    );
    expect(isPdf(result.pdf)).toBe(true);
  });

  it("produces byte-identical output for a fixed creationTimestamp", () => {
    const opts = { assets, creationTimestamp: 0 };
    const first = expectPdf(compiler.compilePdf(conforming, opts));
    const second = expectPdf(compiler.compilePdf(conforming, opts));
    expect(latin1(first.pdf)).toContain("1970-01-01T00:00:00");
    expect(Buffer.from(first.pdf).equals(Buffer.from(second.pdf))).toBe(true);
  });
});

describe("PDF standards (ua-1)", () => {
  it("declares validated PDF/UA-1 conformance", () => {
    const { pdf } = expectPdf(
      compiler.compilePdf(conforming, { assets, pdfStandard: "ua-1" }),
    );
    expect(latin1(pdf)).toContain("pdfuaid");
    expect(latin1(pdf)).toContain("StructTreeRoot");
  });

  it("fails nonconforming documents with recognizable violations", () => {
    const nonconforming = `${preamble}== Not level one\nBody.\n`;
    const result = compiler.compilePdf(nonconforming, {
      pdfStandard: "ua-1",
    });
    expect(result.error).toBe("compile-failed");
    if (result.error) {
      expect(result.compileErrors.length).toBeGreaterThan(0);
      // Every failure is a conformance violation (with a source range), so
      // callers can distinguish "doesn't conform" from "broken document"
      // and fall back to an unclaimed export.
      expect(result.compileErrors.every(isPdfStandardViolation)).toBe(true);
      expect(result.compileErrors.some((d) => d.range)).toBe(true);
    }
    const fallback = expectPdf(compiler.compilePdf(nonconforming, {}));
    expect(latin1(fallback.pdf)).not.toContain("pdfuaid");
    expect(latin1(fallback.pdf)).toContain("StructTreeRoot");
  });

  it("rejects violations for missing alt text", () => {
    const noAlt = `${preamble}#figure(image("/assets/dot.png", width: 10pt), caption: [No alt])\n`;
    const result = compiler.compilePdf(noAlt, { assets, pdfStandard: "ua-1" });
    expect(result.error).toBe("compile-failed");
    if (result.error) {
      expect(
        result.compileErrors.some((d) =>
          d.message.includes("missing alt text"),
        ),
      ).toBe(true);
    }
  });
});

describe("fonts", () => {
  it("lists loaded font families and deduplicates repeated files", async () => {
    const own = await TypstCompiler.create({ wasm: wasmBytes });
    const inter = font("inter/Inter_18pt-Regular.ttf");
    expect(own.addFont(inter)).toBe(1);
    expect(own.addFont(font("GeistMono-Regular.ttf"))).toBe(1);
    // Byte-identical repeat is a no-op.
    expect(own.addFont(font("inter/Inter_18pt-Regular.ttf"))).toBe(0);
    expect(own.fontFamilies()).toEqual(["Inter 18pt", "Geist Mono"]);
  });
});

describe("the real exporter document", () => {
  it("compiles the shared test document snapshot as declared ua-1", async () => {
    const full = await TypstCompiler.create({
      wasm: wasmBytes,
      fonts: [
        font("inter/Inter_18pt-Regular.ttf"),
        font("inter/Inter_18pt-Italic.ttf"),
        font("inter/Inter_18pt-Bold.ttf"),
        font("inter/Inter_18pt-BoldItalic.ttf"),
        font("GeistMono-Regular.ttf"),
        font("newcm/NewCMMath-Regular.otf"),
        font("newcm/NewCMMath-Book.otf"),
        font("noto/Noto-COLRv1.ttf"),
      ],
    });
    const exporterSrc = join(pkgDir, "..", "xl-typst-exporter", "src");
    const source = readFileSync(
      join(exporterSrc, "__snapshots__", "testDocument.typ"),
      "utf8",
    );
    // The exporter's markup references its assets: the document's image and
    // the code-highlighting theme (which the exporter's `assetFiles` always
    // carries - a consumer maps them all in, and so does this test). The
    // theme is read from the exporter's source like the snapshot itself; if
    // the exporter renames the path, this compile fails loudly.
    const codeTheme = new Uint8Array(
      readFileSync(join(exporterSrc, "codeTheme.tmTheme")),
    );
    const { pdf } = expectPdf(
      full.compilePdf(source, {
        assets: new Map([
          ["/assets/asset-0", png],
          ["/assets/code-theme.tmTheme", codeTheme],
        ]),
        pdfStandard: "ua-1",
      }),
    );
    expect(isPdf(pdf)).toBe(true);
    expect(latin1(pdf)).toContain("pdfuaid");
  });
});
