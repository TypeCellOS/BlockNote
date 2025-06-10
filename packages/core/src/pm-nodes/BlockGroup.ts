import { Node } from "@tiptap/core";
import { BlockNoteDOMAttributes } from "../schema/index.js";
import { mergeCSSClasses } from "../util/browser.js";

export const BlockGroup = Node.create<{
  domAttributes?: BlockNoteDOMAttributes;
}>({
  name: "blockGroup",
  group: "childContainer",
  content: "blockGroupChild+",
  marks: "deletion insertion modification",
  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (element.getAttribute("data-node-type") === "blockGroup") {
            // Null means the element matches, but we don't want to add any attributes to the node.
            return null;
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const blockGroupHTMLAttributes = {
      ...(this.options.domAttributes?.blockGroup || {}),
      ...HTMLAttributes,
    };
    const blockGroup = document.createElement("div");
    blockGroup.className = mergeCSSClasses(
      "bn-block-group",
      blockGroupHTMLAttributes.class,
    );
    blockGroup.setAttribute("data-node-type", "blockGroup");
    for (const [attribute, value] of Object.entries(blockGroupHTMLAttributes)) {
      if (attribute !== "class") {
        blockGroup.setAttribute(attribute, value);
      }
    }

    return {
      dom: blockGroup,
      contentDOM: blockGroup,
    };
  },
});
