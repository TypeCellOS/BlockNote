import { createBlockSpec } from "../../schema/index.js";
import { BlockNoteSchema } from "../../editor/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";

const CustomParagraph = createBlockSpec(
  {
    type: "customParagraph",
    content: "inline",
    propSchema: {},
  },
  {
    render: () => {
      const customParagraph = document.createElement("p");

      return {
        dom: customParagraph,
        contentDOM: customParagraph,
      };
    },
  }
);
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    customParagraph: CustomParagraph as any,
  },
});
