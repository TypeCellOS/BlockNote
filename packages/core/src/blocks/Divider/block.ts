import z from "zod/v4";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec, createPropSchemaFromZod } from "../../schema/index.js";

export type DividerBlockConfig = ReturnType<typeof createDividerBlockConfig>;

export const createDividerBlockConfig = createBlockConfig(
  () =>
    ({
      type: "divider" as const,
      propSchema: createPropSchemaFromZod(z.object({})),
      content: "none",
    }) as const,
);

export const createDividerBlockSpec = createBlockSpec(
  createDividerBlockConfig,
  {
    meta: {
      isolating: false,
    },
    parse(element) {
      if (element.tagName === "HR") {
        return {};
      }

      return undefined;
    },
    render() {
      const dom = document.createElement("hr");

      return {
        dom,
      };
    },
    runsBefore: [],
  },
  [
    createExtension({
      key: "divider-block-shortcuts",
      inputRules: [
        {
          find: new RegExp(`^---$`),
          replace() {
            return { type: "divider", props: {}, content: [] };
          },
        },
      ],
    }),
  ],
);
