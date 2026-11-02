import type { Extension } from "@blocknote/core";

/**
 * Structural capability supplied by the editor. This intentionally duplicates
 * the math-block interface to keep the two packages independent.
 */
export interface MathRenderer extends Extension<unknown, "math-render"> {
  render(
    source: string,
    inline?: boolean,
  ):
    | { htmlString: string; error?: undefined }
    | { htmlString: string; error: string };
}
