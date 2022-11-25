import { InputRule, Node, NodeViewRendererProps } from "@tiptap/core";
import styles from "./Block.module.css";

export type HeadingContentAttributes = {
  level: string;
};

export const HeadingContent = Node.create({
  name: "headingContent",
  group: "blockContent",
  content: "inline*",

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const element = document.createElement("div");
      element.setAttribute("data-node-type", "block-content");
      element.setAttribute("data-content-type", this.name);
      element.className = styles.blockContent;

      const editableElement = document.createElement(
        "h" + props.HTMLAttributes["level"]
      );
      element.appendChild(editableElement);

      return {
        dom: element,
        contentDOM: editableElement,
      };
    };
  },

  addAttributes() {
    return {
      level: { default: "1" },
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

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-node-type": "block-content",
        "data-content-type": this.name,
        class: styles.blockContent,
      },
      ["h" + HTMLAttributes["level"], 0],
    ];
  },
});
