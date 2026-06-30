import { ReactCustomBlockRenderProps } from "@blocknote/react";
import type { MathBlockConfig } from "../../block.js";
import { getMathSource } from "../getMathSource.js";
import { MathMLContent } from "./MathMLContent.js";

/**
 * Renders the block's LaTeX source as MathML for external HTML export. The
 * React equivalent of `createMathML`.
 */
export const MathML = (props: ReactCustomBlockRenderProps<MathBlockConfig>) => (
  <MathMLContent source={getMathSource(props.block)} displayMode={true} />
);
