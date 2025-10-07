import { createBlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { createBlockConfig, createBlockSpec } from "../../schema/index.js";

export type DividerBlockConfig = ReturnType<typeof createDividerBlockConfig>;

export const createDividerBlockConfig = createBlockConfig(
  () =>
    ({
      type: "divider" as const,
      propSchema: {},
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
  },
  [
    createBlockNoteExtension({
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
