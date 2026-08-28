import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

type TypstCompilerInstance =
  import("@blocknote/xl-typst-compiler").TypstCompiler;

// The compiler wasm, loaded from the workspace package's build output. Tests
// need `pnpm --filter @blocknote/xl-typst-compiler run build:wasm` to have
// run; failing loudly beats a cryptic resolve error.
function wasmBytes(): Uint8Array {
  const path = resolve(
    __dirname,
    "../../packages/xl-typst-compiler/pkg/blocknote_typst_wasm_bg.wasm",
  );
  try {
    return new Uint8Array(readFileSync(path));
  } catch {
    throw new Error(
      `Missing compiler wasm at ${path} - build it first: ` +
        "pnpm --filter @blocknote/xl-typst-compiler run build:wasm",
    );
  }
}

// The default font set for tests: the shared assets the exporters reference.
// Unlike the previous node-compiler setup (which scanned *system* fonts),
// this is deterministic across machines - a test render can only use fonts
// that are checked into the repo.
function defaultFontBlobs(): Uint8Array[] {
  const fontDir = resolve(__dirname, "../assets/fonts");
  return [
    "inter/Inter_18pt-Regular.ttf",
    "inter/Inter_18pt-Italic.ttf",
    "inter/Inter_18pt-Bold.ttf",
    "inter/Inter_18pt-BoldItalic.ttf",
    "GeistMono-Regular.ttf",
    "newcm/NewCMMath-Regular.otf",
    "newcm/NewCMMath-Book.otf",
    "noto/Noto-COLRv1.ttf",
  ].map((f) => new Uint8Array(readFileSync(join(fontDir, f))));
}

// One shared compiler for the common (default-font) case - font parsing
// would otherwise repeat per compile. A call with custom `fontBlobs` gets
// its own compiler, since an instance's font set only grows.
let defaultCompiler: TypstCompilerInstance | undefined;

/**
 * Compiles Typst source for tests, mapping an exporter's collected
 * `assetFiles` into the compiler first. Fonts default to the shared test
 * font set (Inter, Geist Mono, New CM Math, Noto Color Emoji).
 *
 * Pass `pdfStandard: "ua-1"` to produce a *declared* PDF/UA-1 - Typst
 * validates conformance at compile time and this helper throws on
 * violations (e.g. images or equations without alt text), making the
 * compile itself a conformance gate.
 */
export async function compileTypstForTesting(
  typst: string,
  options: {
    assets?: ReadonlyMap<string, Uint8Array>;
    pdfStandard?: string;
    creationTimestamp?: number;
    fontBlobs?: Uint8Array[];
  } = {},
): Promise<Uint8Array> {
  const { TypstCompiler } = await import("@blocknote/xl-typst-compiler");
  let compiler: TypstCompilerInstance;
  // Truthiness on the array (not its length): an explicit `[]` means "a
  // font-less compiler", not "the defaults".
  if (options.fontBlobs) {
    compiler = await TypstCompiler.create({
      wasm: wasmBytes(),
      fonts: options.fontBlobs,
    });
  } else {
    defaultCompiler ??= await TypstCompiler.create({
      wasm: wasmBytes(),
      fonts: defaultFontBlobs(),
    });
    compiler = defaultCompiler;
  }
  const result = compiler.compilePdf(typst, {
    assets: options.assets,
    pdfStandard: options.pdfStandard,
    creationTimestamp: options.creationTimestamp,
  });
  if (result.error) {
    // Tests want failures loud; production code uses the typed result.
    throw new Error(
      `Typst compile failed:\n${result.compileErrors
        .map((d) => d.message)
        .join("\n")}`,
    );
  }
  return result.pdf;
}
