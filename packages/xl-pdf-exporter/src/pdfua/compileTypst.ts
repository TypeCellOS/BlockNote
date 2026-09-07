import {
  TypstCompiler,
  type CompilePdfResult,
  type TypstCompilerOptions,
} from "@blocknote/xl-typst-compiler";

export interface TypstCompileOptions {
  /**
   * The compiler wasm module: a URL (string or `URL`) or the module bytes.
   * Omitted, it loads from `@blocknote/xl-typst-compiler`'s own package
   * files - bundlers emit it as an asset, so zero-config exports involve no
   * CDN. The module is loaded once per page; only the first compile's value
   * is used.
   */
  wasm?: TypstCompilerOptions["wasm"];
  /**
   * Fonts (as bytes) to load into the compiler - the body fonts the
   * source references (e.g. Inter, Geist Mono). This low-level function
   * has no defaults (`PDFExporter` adds those); the compiler ships no
   * fonts of its own: text renders only with supplied fonts, and a
   * document needing a missing one fails to compile (loudly, not with
   * substituted glyphs).
   *
   * Fonts are selected by the family name embedded in each file's name
   * table (array order and file names play no role) - the exporter's
   * `fontFamily` options must match it exactly. A mismatch surfaces as an
   * `unknown font family` entry in the result's `compileWarnings`;
   * `TypstCompiler.fontFamilies` (from `@blocknote/xl-typst-compiler`)
   * lists what a font file actually declares.
   */
  fonts?: Uint8Array[];
  /**
   * The emoji source: an emoji-capable font (or fonts) as bytes. Unlike
   * react-pdf's image-based `emojiSource`, Typst renders emoji from a font,
   * so this is how you supply one. Required for PDF/UA-1 conformant output
   * that contains emoji - the browser has no OS font access, so without it
   * emoji render as `.notdef` and fail ISO 14289-1 clauses 7.21.7 / 7.21.8.
   * Loaded alongside {@link fonts} (this is just a clearer, dedicated
   * channel for it).
   */
  emojiFont?: Uint8Array | Uint8Array[];
  /**
   * Image/asset files to map into the compiler's virtual filesystem, keyed
   * by the Typst path referenced in the source (e.g. `/assets/asset-0`).
   * Populate from `TypstExporter.assetFiles`.
   */
  assets?: ReadonlyMap<string, Uint8Array>;
  /**
   * PDF creation timestamp in seconds since the Unix epoch (UTC). Pass a
   * fixed value for byte-reproducible output; omitted means no timestamp.
   */
  creationTimestamp?: number;
}

function fontList(options: TypstCompileOptions): Uint8Array[] {
  const emojiFonts =
    options.emojiFont === undefined
      ? []
      : Array.isArray(options.emojiFont)
        ? options.emojiFont
        : [options.emojiFont];
  return [...(options.fonts ?? []), ...emojiFonts];
}

/**
 * Compile Typst source to PDF with the wasm engine
 * (`@blocknote/xl-typst-compiler`). Compilation failure - invalid markup,
 * a missing font, or PDF-standard validation - is part of the contract and
 * comes back as a typed result, not an exception.
 *
 * Pass `pdfStandard: "ua-1"` for a *validated*, declared PDF/UA-1; without
 * it the output is tagged (accessible structure tree) but carries no
 * conformance claim.
 */
export async function compileTypstToPdf(
  typst: string,
  options: TypstCompileOptions & {
    pdfStandard?: string;
    tagged?: boolean;
  } = {},
): Promise<CompilePdfResult> {
  // A fresh instance per compile: the wasm module is loaded once globally
  // and Typst's caches are module-wide, so instance creation (including
  // parsing the fonts) costs single-digit milliseconds - not worth any
  // reuse scheme, and it keeps compiles fully independent.
  const compiler = await TypstCompiler.create({
    wasm: options.wasm,
    fonts: fontList(options),
  });
  return compiler.compilePdf(typst, {
    assets: options.assets,
    pdfStandard: options.pdfStandard,
    tagged: options.tagged,
    creationTimestamp: options.creationTimestamp,
  });
}
