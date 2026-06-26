import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders a LaTeX source string to KaTeX HTML (and an equivalent DOM element).
 *
 * Renders with `throwOnError: true` first so we can surface syntax errors,
 * then falls back to KaTeX's own error rendering so the output is never empty.
 *
 * @param source The LaTeX source to render.
 * @param displayMode Whether to render in display (block) or inline mode.
 */
export const renderKatex = (
  source: string,
  displayMode: boolean,
): { html: string; dom: HTMLElement; error: string | null } => {
  let html: string;
  let error: string | null = null;
  try {
    html = katex.renderToString(source, {
      throwOnError: true,
      displayMode,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    html = katex.renderToString(source, {
      throwOnError: false,
      displayMode,
    });
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  const dom = template.content.firstElementChild as HTMLElement;

  return { html, dom, error };
};
