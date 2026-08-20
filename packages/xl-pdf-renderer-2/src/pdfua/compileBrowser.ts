import type { TypstSnippet } from "@myriaddreamin/typst.ts/contrib/snippet";
import type { InitOptions } from "@myriaddreamin/typst.ts/options.init";

export interface TypstCompileOptions {
  /**
   * Returns the wasm module for the Typst compiler. In a browser bundler this
   * is typically the imported `.wasm` URL/bytes from
   * `@myriaddreamin/typst-ts-web-compiler`, e.g.
   * `getModule: () => new URL("...", import.meta.url)`.
   *
   * If omitted, Typst.ts loads its matching compiler wasm from its CDN — handy
   * for demos, but bundle/self-host it for production.
   */
  getModule?: InitOptions["getModule"];
  /**
   * Extra fonts (as bytes) to load into the compiler — typically the body fonts
   * the exporter references (e.g. Inter, Geist Mono).
   */
  fonts?: Uint8Array[];
  /**
   * The emoji source: an emoji-capable font (or fonts) as bytes. Unlike
   * react-pdf's image-based `emojiSource`, Typst renders emoji from a font, so
   * this is how you supply one. Required for *fully* PDF/UA-1 conformant output
   * that contains emoji — the browser has no OS font access, so without it emoji
   * render as `.notdef` and fail ISO 14289-1 clauses 7.21.7 / 7.21.8. Loaded
   * alongside {@link fonts} (this is just a clearer, dedicated channel for it).
   */
  emojiFont?: Uint8Array | Uint8Array[];
  /**
   * Fetch Typst's default font assets (Libertinus Serif, etc.).
   * @default true
   */
  preloadDefaultFonts?: boolean;
  /**
   * Image/asset files to map into the compiler's virtual filesystem, keyed by
   * the Typst path referenced in the source (e.g. `/assets/asset-0`).
   * Populate from `TypstExporter.assetFiles`.
   */
  assets?: ReadonlyMap<string, Uint8Array>;
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

// The wasm compiler is a page-level singleton (typst.ts's own `$typst` is
// module-global), so its init-time inputs — wasm module, font set, default
// font preloading — are fixed by the first compile. A later compile that
// tries to CHANGE them throws a descriptive error instead of silently
// compiling with the first call's configuration: pass every font the page
// will need on the first call, reusing the same byte arrays across calls.
// (These constraints — and that a failed wasm load can only be recovered by
// a page reload — are inherent to the `$typst` snippet singleton; lifting
// them means moving to typst.ts's per-instance compiler API.)
let configured:
  | {
      snippet: TypstSnippet;
      fonts: Set<Uint8Array>;
      hasGetModule: boolean;
      preloadDefaultFonts: boolean;
    }
  | undefined;

// Compiles are serialized: shadow files (the per-document image assets) are
// state on the shared compiler, so overlapping compiles would reset or read
// each other's assets mid-flight. The chain also covers initialization, so
// two concurrent first compiles cannot double-initialize. A failed compile
// must not break the chain for the next caller, hence the swallow-and-await
// structure below (the failure still rejects that caller's own promise).
let queue: Promise<unknown> = Promise.resolve();

async function getSnippet(options: TypstCompileOptions): Promise<TypstSnippet> {
  if (configured) {
    const newFonts = fontList(options).filter((f) => !configured!.fonts.has(f));
    if (
      newFonts.length > 0 ||
      Boolean(options.getModule) !== configured.hasGetModule ||
      (options.preloadDefaultFonts !== false) !== configured.preloadDefaultFonts
    ) {
      throw new Error(
        "The Typst compiler is already initialized with different options. " +
          "Its wasm module and fonts are loaded once, on the first compile - " +
          "pass every font (and the getModule/preloadDefaultFonts settings) " +
          "the page will need on the first compileTypstToTaggedPdf call, " +
          "reusing the same byte arrays across calls.",
      );
    }
    return configured.snippet;
  }

  const { $typst, TypstSnippet } =
    await import("@myriaddreamin/typst.ts/contrib/snippet");
  if (options.getModule) {
    $typst.setCompilerInitOptions({ getModule: options.getModule });
  }
  const providers = [];
  if (options.preloadDefaultFonts !== false) {
    providers.push(TypstSnippet.preloadFontAssets());
  }
  const fonts = fontList(options);
  for (const font of fonts) {
    providers.push(TypstSnippet.preloadFontData(font));
  }
  if (providers.length) {
    $typst.use(...providers);
  }
  configured = {
    snippet: $typst,
    fonts: new Set(fonts),
    hasGetModule: Boolean(options.getModule),
    preloadDefaultFonts: options.preloadDefaultFonts !== false,
  };
  return configured.snippet;
}

/**
 * Compile Typst source to a *tagged* PDF using the browser (wasm) engine.
 * The compiler is initialized once and reused; concurrent calls are
 * serialized (see above).
 */
export async function compileTypstToTaggedPdf(
  typst: string,
  options: TypstCompileOptions,
): Promise<Uint8Array> {
  const run = queue.then(async () => {
    const $typst = await getSnippet(options);
    // Shadow files are per-compile; reset so a previous document's assets
    // don't leak into this one.
    await $typst.resetShadow();
    for (const [path, bytes] of options.assets ?? []) {
      await $typst.mapShadow(path, bytes);
    }
    const pdf = await $typst.pdf({ mainContent: typst });
    if (!pdf) {
      throw new Error("Typst wasm compilation produced no output");
    }
    return pdf;
  });
  // Keep the chain alive whether this compile succeeds or fails; the failure
  // still propagates through `run` to this caller.
  queue = run.catch(() => undefined);
  return run;
}
