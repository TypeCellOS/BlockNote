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
   * Extra fonts (as bytes) to load into the compiler. To produce a *fully*
   * PDF/UA-1 conformant document, include an emoji-capable font: the browser
   * has no OS font access, so emoji would otherwise render as `.notdef` and
   * fail ISO 14289-1 clauses 7.21.7 / 7.21.8.
   */
  fonts?: Uint8Array[];
  /**
   * Fetch Typst's default font assets (Libertinus Serif, etc.).
   * @default true
   */
  preloadDefaultFonts?: boolean;
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
      for (const font of options.fonts ?? []) {
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
  const pdf = await $typst.pdf({ mainContent: typst });
  if (!pdf) {
    throw new Error("Typst wasm compilation produced no output");
  }
  return pdf;
}
