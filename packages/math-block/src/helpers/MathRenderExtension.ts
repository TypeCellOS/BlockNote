import { createExtension, type Extension } from "@blocknote/core";

import { latexToHTMLString } from "./latexToHTMLString.js";

/** The math package's renderer, shared with other blocks through the editor. */
export interface MathRenderer extends Extension<unknown, "math-render"> {
  render: typeof latexToHTMLString;
}

export const MathRenderExtension = createExtension({
  key: "math-render",
  render: latexToHTMLString,
} satisfies MathRenderer);
