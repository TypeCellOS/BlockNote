import { StyleSchema } from "@blocknote/core";
import { ReactCustomInlineContentRenderProps } from "@blocknote/react";
import { getMathSource } from "../helpers/getMathSource.js";
import { MathMLContent } from "../helpers/toExternalHTML/MathMLContent.js";
import { inlineMathConfig } from "./inlineMathConfig.js";

/**
 * Renders the inline content's LaTeX source as inline MathML for external HTML
 * export.
 */
export const InlineMathML = (
  props: ReactCustomInlineContentRenderProps<
    typeof inlineMathConfig,
    StyleSchema
  >,
) => (
  <MathMLContent
    source={getMathSource(props.inlineContent)}
    displayMode={false}
  />
);
