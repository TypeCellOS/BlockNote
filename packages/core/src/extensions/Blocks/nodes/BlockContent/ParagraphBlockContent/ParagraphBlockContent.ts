import { mergeAttributes } from "@tiptap/core";
import { createTipTapBlock } from "../../../api/block";
import styles from "../../Block.module.css";
import { mergeCSSClasses } from "../../../../../shared/utils";

export const ParagraphBlockContent = createTipTapBlock({
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
            styles.blockContent,
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
            styles.inlineContent,
            inlineContentDOMAttributes.class
          ),
        },
        0,
      ],
    ];
  },
});
