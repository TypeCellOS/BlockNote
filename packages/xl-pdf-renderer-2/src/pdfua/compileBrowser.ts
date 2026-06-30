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
   * the Typst path referenced in the source (e.g. `/assets/asset-0.png`).
   * Populate from `TypstExporter.assetFiles`.
   */
  assets?: ReadonlyMap<string, Uint8Array>;
}

let snippetPromise: Promise<TypstSnippet> | undefined;

async function getSnippet(options: TypstCompileOptions): Promise<TypstSnippet> {
  if (!snippetPromise) {
    snippetPromise = (async () => {
      const { $typst, TypstSnippet } =
        await import("@myriaddreamin/typst.ts/contrib/snippet");
      if (options.getModule) {
        $typst.setCompilerInitOptions({ getModule: options.getModule });
      }
      const providers = [];
      if (options.preloadDefaultFonts !== false) {
        providers.push(TypstSnippet.preloadFontAssets());
      }
      const emojiFonts =
        options.emojiFont === undefined
          ? []
          : Array.isArray(options.emojiFont)
            ? options.emojiFont
            : [options.emojiFont];
      for (const font of [...(options.fonts ?? []), ...emojiFonts]) {
        providers.push(TypstSnippet.preloadFontData(font));
      }
      if (providers.length) {
        $typst.use(...providers);
      }
      return $typst;
    })();
  }
  return snippetPromise;
}

/**
 * Compile Typst source to a *tagged* PDF using the browser (wasm) engine.
 * The compiler is initialized once and reused across calls.
 */
export async function compileTypstToTaggedPdf(
  typst: string,
  options: TypstCompileOptions,
): Promise<Uint8Array> {
  const $typst = await getSnippet(options);
  // Shadow files are per-compile; reset so a previous document's assets don't
  // leak into this one (the snippet/compiler is reused across calls).
  await $typst.resetShadow();
  for (const [path, bytes] of options.assets ?? []) {
    await $typst.mapShadow(path, bytes);
  }
  const pdf = await $typst.pdf({ mainContent: typst });
  if (!pdf) {
    throw new Error("Typst wasm compilation produced no output");
  }
  return pdf;
}
