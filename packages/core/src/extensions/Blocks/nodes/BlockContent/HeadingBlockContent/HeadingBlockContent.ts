import { InputRule, mergeAttributes } from "@tiptap/core";
import { createTipTapBlock } from "../../../api/block";
import styles from "../../Block.module.css";
import { mergeCSSClasses } from "../../../../../shared/utils";

export const HeadingBlockContent = createTipTapBlock<"heading">({
  name: "heading",
  content: "inline*",

  addAttributes() {
    return {
      level: {
        default: "1",
        // instead of "level" attributes, use "data-level"
        parseHTML: (element) => element.getAttribute("data-level"),
        renderHTML: (attributes) => {
          return {
            "data-level": attributes.level,
          };
        },
      },
    };
  },

  addInputRules() {
    return [
      ...["1", "2", "3"].map((level) => {
        // Creates a heading of appropriate level when starting with "#", "##", or "###".
        return new InputRule({
          find: new RegExp(`^(#{${parseInt(level)}})\\s$`),
          handler: ({ state, chain, range }) => {
            chain()
              .BNUpdateBlock(state.selection.from, {
                type: "heading",
                props: {
                  level: level as "1" | "2" | "3",
                },
              })
              // Removes the "#" character(s) used to set the heading.
              .deleteRange({ from: range.from, to: range.to });
          },
        });
      }),
    ];
  },

  parseHTML() {
    return [
      {
        tag: "h1",
        attrs: { level: "1" },
        node: "heading",
      },
      {
        tag: "h2",
        attrs: { level: "2" },
        node: "heading",
      },
      {
        tag: "h3",
        attrs: { level: "3" },
        node: "heading",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const blockContentDOMAttributes =
      this.options.domAttributes?.blockContent || {};
    const inlineContentDOMAttributes =
      this.options.domAttributes?.inlineContent || {};

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: mergeCSSClasses(
          styles.blockContent,
          blockContentDOMAttributes.class
        ),
        "data-content-type": this.name,
      }),
      [
        "h" + node.attrs.level,
        {
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
