import {
  BlockSchema,
  createBlockConfig,
  createBlockSpec,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { BlockNoteSchema } from "../BlockNoteSchema.js";

export type PageBreakBlockConfig = ReturnType<
  typeof createPageBreakBlockConfig
>;

export const createPageBreakBlockConfig = createBlockConfig(
  () =>
    ({
      type: "pageBreak" as const,
      propSchema: {},
      content: "none",
    }) as const,
);

export const createPageBreakBlockSpec = createBlockSpec(
  createPageBreakBlockConfig,
  {
    parse(element) {
      if (
        element.tagName === "DIV" &&
        element.hasAttribute("data-page-break")
      ) {
        return {};
      }

      return undefined;
    },
    render() {
      const pageBreak = document.createElement("div");

      pageBreak.setAttribute("data-page-break", "");

      return {
        dom: pageBreak,
      };
    },
    toExternalHTML() {
      const pageBreak = document.createElement("div");

      pageBreak.setAttribute("data-page-break", "");

      return {
        dom: pageBreak,
      };
    },
  },
);

/**
 * Adds page break support to the given schema.
 */
export const withPageBreak = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: BlockNoteSchema<B, I, S>,
) => {
  return schema.extend({
    blockSpecs: {
      pageBreak: createPageBreakBlockSpec(),
    },
  });
};
