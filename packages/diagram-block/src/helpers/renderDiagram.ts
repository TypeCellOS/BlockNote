import { PeleError, renderAsync } from "pele/lazy";

import type { DiagramMathRenderer } from "./DiagramMathRenderer.js";

export const DEFAULT_DIAGRAM_FONT_FAMILY = '"Inter", sans-serif';

let diagramId = 0;

/** Shared preview/export adapter. Only invalid user input becomes an error value. */
export async function renderDiagram(
  source: string,
  options: {
    fontFamily?: string;
    responsive?: boolean;
    math?: DiagramMathRenderer;
  } = {},
): Promise<
  | ({ error?: undefined } & Awaited<ReturnType<typeof renderAsync>>)
  | { error: string }
> {
  try {
    return await renderAsync(source, {
      ...options,
      // Adapt our renderer contract at the backend boundary, not in callers.
      math: options.math
        ? (source, fontSize) => {
            const result = options.math?.(source, { fontSize });
            if (!result) {
              return null;
            }
            const { content, width, height } = result;
            return result.format === "html"
              ? { html: content, width, height }
              : { svg: content, width, height };
          }
        : undefined,
      fontFamily: options.fontFamily ?? DEFAULT_DIAGRAM_FONT_FAMILY,
      idPrefix: `bn-diagram-${diagramId++}`,
      // Preserve the source direction, consistently in previews and exports.
      autoDirection: false,
    });
  } catch (error) {
    if (error instanceof PeleError) {
      return { error: error.message };
    }
    throw error;
  }
}
