// eslint-disable-next-line import/no-unresolved
import codeThemeXml from "./codeTheme.tmTheme?raw";

/**
 * The syntax-highlighting theme for exported code blocks, mirroring the
 * editor: the code-block package highlights with shiki's `github-dark` on
 * the editor's `#161616` block background (Block.css `codeBlock`). Typst
 * highlights with syntect, which takes TextMate themes - so the editor's
 * look is mirrored by `codeTheme.tmTheme`, a minimal theme carrying
 * github-dark's token palette. It ships as a virtual compiler file at this
 * path; `TypstExporter.assetFiles` always includes it, and the preamble's
 * `#set raw(theme: ...)` references it.
 */
export const TYPST_CODE_THEME_PATH = "/assets/code-theme.tmTheme";

export const TYPST_CODE_THEME_BYTES: Uint8Array = new TextEncoder().encode(
  codeThemeXml,
);
