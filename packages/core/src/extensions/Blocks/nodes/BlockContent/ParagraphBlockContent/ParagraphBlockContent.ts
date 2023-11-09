import { mergeAttributes } from "@tiptap/core";
import { defaultProps } from "../../../api/defaultProps";
import { createTipTapBlock } from "../../../api/block";
import { mergeCSSClasses } from "../../../../../shared/utils";
import { BlockSpec } from "../../../api/blockTypes";
import { serializeBlockToHTMLDefault } from "../../../../../api/serialization/html/shared";

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
    const blockContentDOMAttributes =
      this.options.domAttributes?.blockContent || {};
    const inlineContentDOMAttributes =
      this.options.domAttributes?.inlineContent || {};

    return [
      "div",
      mergeAttributes(
        {
          ...blockContentDOMAttributes,
          class: mergeCSSClasses(
            "blockContent",
            blockContentDOMAttributes.class
          ),
          "data-content-type": this.name,
        },
        HTMLAttributes
      ),
      [
        "p",
        {
          ...inlineContentDOMAttributes,
          class: mergeCSSClasses(
            "inlineContent",
            inlineContentDOMAttributes.class
          ),
        },
        0,
      ],
    ];
  },
});

export const Paragraph = {
  node: ParagraphBlockContent,
  propSchema: paragraphPropSchema,
  toInternalHTML: serializeBlockToHTMLDefault,
  toExternalHTML: serializeBlockToHTMLDefault,
} satisfies BlockSpec<"paragraph", typeof paragraphPropSchema, true>;
