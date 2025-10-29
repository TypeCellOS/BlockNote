import {
  BlockNoteSchema,
  createInlineContentSpec,
  createPropSchemaFromZod,
} from "@blocknote/core";
import * as z from "zod/v4";
export const mention = createInlineContentSpec(
  {
    type: "mention",
    propSchema: createPropSchemaFromZod(
      z.object({
        user: z.string().default(""),
      }),
    ),
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

export const schemaWithMention = BlockNoteSchema.create().extend({
  inlineContentSpecs: {
    mention,
  },
});
