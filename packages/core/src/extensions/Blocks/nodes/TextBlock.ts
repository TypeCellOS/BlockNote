import { Node, NodeViewRendererProps } from "@tiptap/core";
import styles from "./Block.module.css";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textBlock: {
      setTextBlock: (posInBlock: number) => ReturnType;
    };
  }
}

export const TextBlock = Node.create({
  name: "textBlock",
  content: "inline*",

  addNodeView() {
    return (_props: NodeViewRendererProps) => {
      const element = document.createElement("div");
      element.setAttribute("data-node-type", "block-content");
      element.setAttribute("data-content-type", this.name);
      element.className = styles.blockContent;

      const editableElement = document.createElement("p");
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
        tag: "p",
        priority: 100,
      },
    ];
  },

  renderHTML() {
    return [
      "div",
      {
        "data-node-type": "block-content",
        "data-content-type": this.name,
        class: styles.blockContent,
      },
      ["p", 0],
    ];
  },
});
