import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import styles from "./Block.module.css";

export type HeadingContentAttributes = {
  level: string;
};

export const HeadingContent = Node.create({
  name: "headingContent",
  group: "blockContent",
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
              .BNSetContentType(state.selection.from, "headingContent", {
                level: level,
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
      },
      {
        tag: "h2",
        attrs: { level: "2" },
      },
      {
        tag: "h3",
        attrs: { level: "3" },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-node-type": "block-content", // TODO: only for testing? if so, rename to data-test-*?
        "data-content-type": this.name,
        class: styles.blockContent,
      }),
      ["h" + node.attrs.level, 0],
    ];
  },
});
