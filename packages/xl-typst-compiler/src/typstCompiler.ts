/**
 * A minimal TypeScript API over the Typst compiler (the official `typst`
 * crates, compiled to WebAssembly - see `rust/`): Typst markup + assets +
 * fonts in, PDF bytes (or typed diagnostics) out.
 *
 * Runs anywhere WebAssembly runs - browsers, Node, workers. There is no
 * page-level singleton: create as many compilers as needed; each owns only
 * its font set. The wasm module itself is loaded once per page/process.
 */
import initWasm, {
  TypstCompiler as WasmCompiler,
} from "@blocknote/xl-typst-compiler/pkg";

/**
 * One compiler diagnostic. Whether it is an error or a warning is expressed
 * by which result list it arrives in (`compileErrors` / `compileWarnings`),
 * so there is no severity field to cross-check.
 */
export type TypstDiagnostic = {
  message: string;
  hints: string[];
  /** Byte range in the compiled source, when the span points there. */
  range?: [number, number];
};

/**
 * Compilation failure is part of the contract (the source is generated from
 * user content, and PDF-standard validation is expected to fail for
 * nonconforming documents), so it's a value, not an exception.
 */
export type CompilePdfResult =
  | {
      error?: undefined;
      pdf: Uint8Array;
      compileWarnings: TypstDiagnostic[];
    }
  | {
      error: "compile-failed";
      compileErrors: TypstDiagnostic[];
      compileWarnings: TypstDiagnostic[];
    };

export type CompilePdfOptions = {
  /**
   * Files referenced from the markup, keyed by absolute virtual path (e.g.
   * `/assets/asset-0`). `.typ` entries become importable sources; everything
   * else raw bytes (images etc.).
   */
  assets?: ReadonlyMap<string, Uint8Array>;
  /**
   * A PDF standard to enforce, e.g. `"ua-1"` for accessible, tagged
   * PDF/UA-1. Typst validates conformance at compile time: a nonconforming
   * document fails with diagnostics recognizable via
   * {@link isPdfStandardViolation} (e.g. "the first heading must be of
   * level 1"), rather than producing a false conformance claim.
   */
  pdfStandard?: "ua-1" | "a-2b" | "a-3b" | (string & {});
  /**
   * Emit the tagged (accessible) structure tree.
   * @default true
   */
  tagged?: boolean;
  /**
   * PDF creation timestamp in seconds since the Unix epoch (UTC). Pass a
   * fixed value for byte-reproducible output; omitted means no timestamp.
   */
  creationTimestamp?: number;
};

/**
 * Whether a diagnostic is a PDF-standard conformance violation - an
 * expected outcome for nonconforming documents - rather than a genuine
 * compile error. Typst prefixes these with the validator name(s), e.g.
 * `PDF/UA-1 error: missing alt text`.
 */
export function isPdfStandardViolation(diagnostic: TypstDiagnostic): boolean {
  return /^PDF\/[A-Za-z0-9.-]+(?:, ?PDF\/[A-Za-z0-9.-]+)* error:/.test(
    diagnostic.message,
  );
}

let wasmReady: Promise<unknown> | undefined;

export type TypstCompilerOptions = {
  /**
   * The wasm module source: a URL (string or `URL`) or the module bytes.
   * Omitted, the module loads from this package's own files - bundlers
   * (and plain browsers) resolve it next to the wasm-bindgen glue, so
   * zero-config use involves no CDN. In runtimes without URL-relative
   * loading (or to control caching), pass bytes or an explicit URL. Only
   * the first `create()` call's value is used; the module is loaded once.
   */
  wasm?: string | URL | Uint8Array;
  /**
   * Font files to load (every face of each TTF/OTF/TTC). Typst selects
   * fonts by the family name embedded in each file's own name table -
   * array order and file names play no role - so a document must reference
   * the family exactly as the font declares it. {@link
   * TypstCompiler.fontFamilies} lists the loaded names for verification,
   * and a referenced-but-missing family surfaces as an
   * `unknown font family` entry in the result's `compileWarnings`.
   */
  fonts?: readonly Uint8Array[];
};

/**
 * A Typst-to-PDF compiler instance owning a font set.
 *
 * The wasm module embeds no fonts and never touches the network: text
 * renders only with the supplied fonts (a document needing a missing font
 * fails to compile - loudly, not with substituted glyphs).
 */
export class TypstCompiler {
  private readonly inner: WasmCompiler;

  private constructor(inner: WasmCompiler) {
    this.inner = inner;
  }

  static async create(
    options: TypstCompilerOptions = {},
  ): Promise<TypstCompiler> {
    wasmReady ??= initWasm(
      options.wasm === undefined ? undefined : { module_or_path: options.wasm },
    );
    await wasmReady;
    const compiler = new TypstCompiler(new WasmCompiler());
    for (const font of options.fonts ?? []) {
      compiler.addFont(font);
    }
    return compiler;
  }

  /**
   * Load a font file; every face of a collection is added, byte-identical
   * repeats are no-ops. Returns the number of faces added.
   */
  addFont(data: Uint8Array): number {
    return this.inner.add_font(data);
  }

  /**
   * The family names of the loaded fonts (deduplicated, in load order) -
   * what Typst's `#set text(font: ...)` can reference. Useful to verify a
   * supplied font carries the family name the document asks for.
   */
  fontFamilies(): string[] {
    return this.inner.font_families();
  }

  compilePdf(
    source: string,
    options: CompilePdfOptions = {},
  ): CompilePdfResult {
    const paths = [...(options.assets?.keys() ?? [])];
    const data = [...(options.assets?.values() ?? [])];
    // Compile failure is an expected outcome, so the wasm layer *returns*
    // it - one uniform payload for both outcomes. It only throws for
    // caller mistakes (invalid options), which propagate as the genuine
    // errors they are.
    const { pdf, compileErrors, compileWarnings } = this.inner.compile_pdf(
      source,
      paths,
      data,
      {
        pdfStandard: options.pdfStandard,
        tagged: options.tagged,
        creationTimestamp: options.creationTimestamp,
      },
    ) as {
      pdf?: Uint8Array;
      compileErrors: TypstDiagnostic[];
      compileWarnings: TypstDiagnostic[];
    };
    if (pdf !== undefined && compileErrors.length === 0) {
      return { pdf, compileWarnings };
    }
    if (pdf === undefined && compileErrors.length > 0) {
      return { error: "compile-failed", compileErrors, compileWarnings };
    }
    // Output and errors must be mutually exclusive; anything else means
    // the compiler misreported its outcome - a bug to fail loudly on.
    throw new Error(
      `TypstCompiler invariant violated: ${
        pdf !== undefined
          ? "produced a PDF alongside errors"
          : "produced neither a PDF nor errors"
      }`,
    );
  }
}
