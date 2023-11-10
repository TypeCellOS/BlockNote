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
        tag: "p",
        priority: 200,
        node: "paragraph",
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
} satisfies BlockSpec<"paragraph", typeof paragraphPropSchema, true>;
