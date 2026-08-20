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
   * Fetch Typst's default font assets (Libertinus Serif, New Computer Modern
   * Math, etc.) from the jsdelivr CDN. Pass `false` for fully offline,
   * bundled-fonts-only compiles - then supply every font the document needs
   * via {@link fonts}, *including a math font* (e.g. NewCMMath-Regular.otf)
   * when the document contains equations.
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

// A cheap content fingerprint for font byte arrays, so byte-identical fonts
// pass the compatibility check even as fresh Uint8Array instances (a caller
// refetching the same files per export, test retries, HMR) - reference
// identity would spuriously reject them. Length plus the first bytes is
// discriminating enough: a font file's table directory (offsets, checksums)
// sits at the start, so different fonts diverge immediately.
function fontFingerprint(bytes: Uint8Array): string {
  let hash = 0;
  const end = Math.min(bytes.length, 256);
  for (let i = 0; i < end; i++) {
    hash = (hash * 31 + bytes[i]) | 0;
  }
  return `${bytes.length}:${hash}`;
}

// Canonicalizes a getModule result for the compatibility check below.
// Strings compare by value on their own, but the equally-documented
// `getModule: () => new URL(..., import.meta.url)` pattern returns a fresh
// `URL` instance per call - comparing those by identity would spuriously
// reject every compile after the first. URLs therefore compare by href;
// other module forms (bytes, WebAssembly.Module, Response) keep reference
// identity, as callers hold onto those.
function moduleSourceKey(source: unknown): unknown {
  return source instanceof URL ? source.href : source;
}

// The wasm compiler is a page-level singleton (typst.ts's own `$typst` is
// module-global), so its init-time inputs — wasm module, font set, default
// font preloading — are fixed by the first compile. A later compile that
// tries to CHANGE them throws a descriptive error instead of silently
// compiling with the first call's configuration: pass every font the page
// will need on the first call. (These constraints — and that a failed wasm
// load can only be recovered by a page reload — are inherent to the
// `$typst` snippet singleton; lifting them means moving to typst.ts's
// per-instance compiler API.)
let configured:
  | {
      snippet: TypstSnippet;
      fonts: Set<string>;
      moduleSource: unknown;
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
    const newFonts = fontList(options).filter(
      (f) => !configured!.fonts.has(fontFingerprint(f)),
    );
    // getModule is compared by its *resolved* source (the URL/module it
    // returns, canonicalized via `moduleSourceKey`), not by function
    // identity - callers typically pass a fresh closure per call around the
    // same URL. Omitting it after a first call that had one means "reuse
    // what's loaded" and is fine.
    const moduleChanged =
      options.getModule !== undefined &&
      moduleSourceKey(options.getModule()) !== configured.moduleSource;
    if (
      newFonts.length > 0 ||
      moduleChanged ||
      (options.preloadDefaultFonts !== false) !== configured.preloadDefaultFonts
    ) {
      throw new Error(
        "The Typst compiler is already initialized with different options. " +
          "Its wasm module and fonts are loaded once, on the first compile - " +
          "pass every font (and the getModule/preloadDefaultFonts settings) " +
          "the page will need on the first compileTypstToTaggedPdf call.",
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
  } else {
    // The explicit opt-out marker matters: without a provider whose options
    // say `assets: false`, the compiler driver force-loads its default
    // 'text' font assets (Libertinus, New CM Math, ...) from the jsdelivr
    // CDN even when no preload provider was given - exactly the network
    // dependency this option exists to remove.
    providers.push(TypstSnippet.disableDefaultFontAssets());
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
    fonts: new Set(fonts.map(fontFingerprint)),
    moduleSource: moduleSourceKey(options.getModule?.()),
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
  // Keep the chain alive whether this compile succeeds or fails (the failure
  // still propagates through `run` to this caller) - and resolve it to
  // undefined either way, so the module-global chain doesn't pin the last
  // compile's multi-MB PDF bytes in memory for the page's lifetime.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
