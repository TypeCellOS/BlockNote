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

/** Optional math typesetting, independent of the diagram rendering backend. */
export type DiagramMathRenderer = (
  source: string,
  options: { fontSize: number },
) =>
  | {
      format: "html" | "svg";
      content: string;
      width: number;
      height: number;
    }
  | null
  | undefined;
