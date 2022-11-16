import { Node, NodeViewRendererProps } from "@tiptap/core";
import styles from "./Block.module.css";

export type HeadingBlockAttributes = {
  level: string;
};

export const HeadingBlock = Node.create({
  name: "headingBlock",
  content: "inline*",

  addAttributes() {
    return {
      level: { default: "1" },
    };
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const element = document.createElement("div");
      element.setAttribute("data-node-type", "block-content");
      element.setAttribute("data-content-type", "headingBlock");
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
        "data-content-type": "headingBlock",
        class: styles.blockContent,
      },
      ["h" + HTMLAttributes["level"], 0],
    ];
  },
});
