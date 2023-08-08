import { mergeAttributes } from "@tiptap/core";
import { createTipTapBlock } from "../../../api/block";
import styles from "../../Block.module.css";

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
          class: blockContentDOMAttributes.class
            ? styles.blockContent + " " + blockContentDOMAttributes.class
            : styles.blockContent,
          "data-content-type": this.name,
        },
        HTMLAttributes
      ),
      [
        "p",
        {
          ...inlineContentDOMAttributes,
          class: inlineContentDOMAttributes.class
            ? styles.inlineContent + " " + inlineContentDOMAttributes.class
            : styles.inlineContent,
        },
        0,
      ],
    ];
  },
});
