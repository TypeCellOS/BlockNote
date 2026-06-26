import { useRef } from "react";
import { renderKatex } from "./renderKatex.js";

/**
 * Renders a LaTeX source string to KaTeX HTML for use in a React preview.
 *
 * Keeps the last error-free render so a transient syntax error (while the user
 * is mid-edit) doesn't blank the preview - mirroring the in-place update of the
 * vanilla `createSourceBlockWithPreview`.
 *
 * @param source The LaTeX source to render.
 * @param displayMode Whether to render in display (block) or inline mode.
 */
export const useKatexPreview = (
  source: string,
  displayMode: boolean,
): { html: string; error: string | null } => {
  const { html, error } = renderKatex(source, displayMode);

  const lastHtmlRef = useRef<string | null>(null);
  if (!error || lastHtmlRef.current === null) {
    lastHtmlRef.current = html;
  }

  return { html: lastHtmlRef.current, error };
};
