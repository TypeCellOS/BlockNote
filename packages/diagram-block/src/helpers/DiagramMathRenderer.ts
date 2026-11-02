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
