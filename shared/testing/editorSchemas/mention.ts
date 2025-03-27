import {
  BlockNoteSchema,
  createInlineContentSpec,
  defaultInlineContentSpecs,
} from "@blocknote/core";

export const mention = createInlineContentSpec(
  {
    type: "mention",
    propSchema: {
      user: {
        default: "",
      },
    },
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
  }
);

export const schemaWithMention = BlockNoteSchema.create({
  inlineContentSpecs: {
    mention,
    ...defaultInlineContentSpecs,
  },
});
