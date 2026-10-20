import { PeleError, renderAsync } from "pele/lazy";

import { DEFAULT_DIAGRAM_FONT_FAMILY } from "./svgFontFamily.js";

let diagramId = 0;

/** Shared preview/export adapter. Only invalid user input becomes an error value. */
export async function renderDiagram(
  source: string,
  options: { fontFamily?: string; responsive?: boolean } = {},
): Promise<
  | ({ error?: undefined } & Awaited<ReturnType<typeof renderAsync>>)
  | { error: string }
> {
  try {
    return await renderAsync(source, {
      ...options,
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
