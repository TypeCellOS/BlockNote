import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem";

export type RenderResult = { html: string; error: string | null };

export function renderLatex(
  latex: string,
  options: { displayMode?: boolean } = {},
): RenderResult {
  try {
    const html = katex.renderToString(latex, {
      displayMode: options.displayMode ?? false,
      throwOnError: true,
      strict: "ignore",
      trust: false,
    });
    return { html, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      html: `<span class="formula-error" title="${escapeAttr(message)}">[?]</span>`,
      error: message,
    };
  }
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
