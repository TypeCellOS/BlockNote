import { Node, NodeViewRendererProps } from "@tiptap/core";
import styles from "./Block.module.css";

export type ListItemBlockAttributes = {
  type: string;
};

export const ListItemBlock = Node.create({
  name: "listItemBlock",
  content: "inline*",

  addAttributes() {
    return {
      type: { default: "unordered" },
    };
  },

  addNodeView() {
    return (_props: NodeViewRendererProps) => {
      const element = document.createElement("div");
      element.setAttribute("data-node-type", "block-content");
      element.setAttribute("data-content-type", this.name);
      element.className = styles.blockContent;

      const editableElement = document.createElement("li");
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
        tag: "li",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          // Gets type of list item (ordered/unordered) based on parent element's tag ("ol"/"ul").
          if (parent.tagName === "UL") {
            return { type: "unordered" };
          }

          if (parent.tagName === "OL") {
            return { type: "ordered" };
          }

          return false;
        },
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
      ["li", 0],
    ];
  },
});
