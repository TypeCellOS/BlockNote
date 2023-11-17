import { defaultProps } from "../../../api/defaultProps";
import { createTipTapBlock } from "../../../api/block";
import { BlockSpec } from "../../../api/blockTypes";
import {
  createDefaultBlockDOMOutputSpec,
  defaultBlockToHTML,
} from "../defaultBlockHelpers";

export const paragraphPropSchema = {
  ...defaultProps,
};

export const ParagraphBlockContent = createTipTapBlock<"paragraph", true>({
  name: "paragraph",
  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "div[data-content-type=" + this.name + "]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
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
  toInternalHTML: defaultBlockToHTML,
  toExternalHTML: defaultBlockToHTML,
  fromExternalHTML: (element, getInlineContent) => {
    if (element.tagName === "P") {
      return { type: "paragraph", content: getInlineContent(element) as any };
    }

    return;
  },
} satisfies BlockSpec<"paragraph", typeof paragraphPropSchema, true>;
