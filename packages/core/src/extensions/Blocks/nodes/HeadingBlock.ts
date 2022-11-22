import { mergeAttributes, Node } from "@tiptap/core";
import styles from "./Block.module.css";

export type HeadingBlockAttributes = {
  level: string;
};

export const HeadingBlock = Node.create({
  name: "headingBlock",
  content: "inline*",

  addAttributes() {
    return {
      level: {
        default: "1",
        parseHTML: (element) => element.getAttribute("data-level"),
        renderHTML: (attributes) => {
          return {
            "data-level": attributes.level,
          };
        },
      },
    };
  },

  /*
  TODO: this is not necessary?
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
  },*/

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
