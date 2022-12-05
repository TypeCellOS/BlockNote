import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import styles from "../../Block.module.css";

export type HeadingContentAttributes = {
  headingLevel: string;
};

export const HeadingContent = Node.create({
  name: "headingContent",
  group: "blockContent",
  content: "inline*",

  addAttributes() {
    return {
      headingLevel: {
        default: "1",
        // instead of "level" attributes, use "data-level"
        parseHTML: (element) => element.getAttribute("data-heading-level"),
        renderHTML: (attributes) => {
          return {
            "data-heading-level": attributes.headingLevel,
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
              .BNSetContentType(state.selection.from, "headingContent", {
                headingLevel: level,
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
        attrs: { headingLevel: "1" },
        node: "block"
      },
      {
        tag: "h2",
        attrs: { headingLevel: "2" },
        node: "block"
      },
      {
        tag: "h3",
        attrs: { headingLevel: "3" },
        node: "block"
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    console.log(node.attrs);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: styles.blockContent,
        "data-content-type": this.name,
      }),
      ["h" + node.attrs["headingLevel"], 0],
    ];
  },
});
