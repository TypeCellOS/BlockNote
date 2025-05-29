import {
  BlockNoteSchema,
  createInlineContentSpec,
  defaultInlineContentSpecs,
} from "@blocknote/core";
import * as z from "zod/v4/core";
export const mention = createInlineContentSpec(
  {
    type: "mention",
    propSchema: z.object({
      user: z.string().default(""),
    }),
    content: "none",
  },
  {
    render: (inlineContent) => {
      const mention = document.createElement("span");
      mention.textContent = `@${inlineContent.props.user}`;

      return {
        dom: mention,
      };
    },
  },
);

export const schemaWithMention = BlockNoteSchema.create({
  inlineContentSpecs: {
    mention,
    ...defaultInlineContentSpecs,
  },
});
