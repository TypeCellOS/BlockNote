import { defaultProps } from "../../../api/defaultProps";
import { createTipTapBlock } from "../../../api/block";
import { BlockSpec } from "../../../api/blockTypes";
import { serializeBlockToHTMLDefault } from "../../../../../api/serialization/html/sharedHTMLConversion";
import { defaultRenderHTML } from "../defaultRenderHTML";

export const paragraphPropSchema = {
  ...defaultProps,
};

export const ParagraphBlockContent = createTipTapBlock<"paragraph", true>({
  name: "paragraph",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "p",
        priority: 200,
        node: "paragraph",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return defaultRenderHTML(
      this.name,
      "p",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {}
    );
  },
});

export const Paragraph = {
  node: ParagraphBlockContent,
  propSchema: paragraphPropSchema,
  toInternalHTML: serializeBlockToHTMLDefault,
  toExternalHTML: serializeBlockToHTMLDefault,
} satisfies BlockSpec<"paragraph", typeof paragraphPropSchema, true>;
