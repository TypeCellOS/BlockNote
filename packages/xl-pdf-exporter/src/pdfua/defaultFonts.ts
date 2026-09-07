import { loadFileBuffer } from "@shared/util/fileUtil.js";

/**
 * The family name of the bundled emoji font; {@link PDFExporter} declares it
 * as the default `emojiFontFamily` so multi-codepoint emoji shape correctly
 * with zero configuration.
 */
export const DEFAULT_EMOJI_FONT_FAMILY = "Noto Color Emoji";

async function fontBytes(
  mod: Promise<{ default: string }>,
): Promise<Uint8Array> {
  const buffer = await loadFileBuffer(await mod);
  // Buffer and ArrayBuffer both convert; a fresh Uint8Array also gives the
  // compiler's font-set fingerprinting stable instances via the cache below.
  return new Uint8Array(buffer as ArrayBuffer);
}

// Both loaders are cached module-wide: the wasm compiler loads fonts once
// per page, and its compatibility check must see the same byte arrays on
// every export. A transient load failure must not poison every later
// export, so a rejected cache entry clears itself for the next retry.
function cached<T>(load: () => Promise<T>): () => Promise<T> {
  let cache: Promise<T> | undefined;
  return () => {
    if (!cache) {
      cache = load();
      cache.catch(() => {
        cache = undefined;
      });
    }
    return cache;
  };
}

/**
 * The default body font set for zero-config exports, matching the editor:
 * these files must declare (in their name tables) exactly the family names
 * the exporters reference by default - TypstExporter's fontFamily /
 * monoFontFamily and {@link DEFAULT_EMOJI_FONT_FAMILY}. The pairing is
 * pinned by pdfExporter.test.ts's "keeps the bundled default fonts in
 * sync" test: swapping a file (or renaming a default) fails it.
 *
 * Inter (body, 4 faces), Geist Mono (code), and New Computer Modern Math
 * (Typst's math family - the compiler wasm embeds no fonts, so without it
 * a document with math blocks fails to compile). Embedded in the package
 * as lazily-imported chunks (the same mechanism the react-pdf exporter
 * uses), so nothing loads until a zero-config export runs, and exports
 * work offline. Used when the compile options' `fonts` is undefined - pass
 * your own (or an explicit `[]` for none) to skip it, or spread this
 * loader's result to *extend* it (e.g. `[...(await loadDefaultBodyFonts()),
 * myCjkFont]`).
 */
export const loadDefaultBodyFonts: () => Promise<Uint8Array[]> = cached(() =>
  Promise.all([
    fontBytes(import("@shared/assets/fonts/inter/Inter_18pt-Regular.ttf")),
    fontBytes(import("@shared/assets/fonts/inter/Inter_18pt-Italic.ttf")),
    fontBytes(import("@shared/assets/fonts/inter/Inter_18pt-Bold.ttf")),
    fontBytes(import("@shared/assets/fonts/inter/Inter_18pt-BoldItalic.ttf")),
    fontBytes(import("@shared/assets/fonts/GeistMono-Regular.ttf")),
    fontBytes(import("@shared/assets/fonts/newcm/NewCMMath-Regular.otf")),
    fontBytes(import("@shared/assets/fonts/newcm/NewCMMath-Book.otf")),
  ]),
);

/**
 * The default emoji font for zero-config exports: Noto Color Emoji (COLRv1
 * - Typst renders emoji from a font, and PDF/UA fails on missing glyphs).
 * Loaded independently of {@link loadDefaultBodyFonts}, matching the
 * per-option semantics: used when the compile options' `emojiFont` is
 * undefined - pass your own (or an explicit `[]` for none) to skip it.
 */
export const loadDefaultEmojiFont: () => Promise<Uint8Array> = cached(() =>
  fontBytes(import("@shared/assets/fonts/noto/Noto-COLRv1.ttf")),
);
