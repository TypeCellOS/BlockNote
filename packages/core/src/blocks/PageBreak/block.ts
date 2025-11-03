import { z } from "zod/v4";
import {
  BlockSchema,
  createBlockConfig,
  createBlockSpec,
  createPropSchemaFromZod,
  CustomBlockNoteSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";

export type PageBreakBlockConfig = ReturnType<
  typeof createPageBreakBlockConfig
>;

export const createPageBreakBlockConfig = createBlockConfig(
  () =>
    ({
      type: "pageBreak" as const,
      propSchema: createPropSchemaFromZod(z.object({})),
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
    runsBefore: [],
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
  schema: CustomBlockNoteSchema<B, I, S>,
) => {
  return schema.extend({
    blockSpecs: {
      pageBreak: createPageBreakBlockSpec(),
    },
  });
};
