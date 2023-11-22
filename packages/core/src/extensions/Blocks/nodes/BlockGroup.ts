import { Node } from "@tiptap/core";
import { mergeCSSClasses } from "../../../shared/utils";
import { BlockNoteDOMAttributes } from "../api/blocks/types";

export const BlockGroup = Node.create<{
  domAttributes?: BlockNoteDOMAttributes;
}>({
  name: "blockGroup",
  group: "blockGroup",
  content: "blockContainer+",
  defining: true,
  parseHTML() {
    return [
      {
        tag: "ul",
        closeParent: true,
        getContent: (element) => {
          // create blockcontainer?
        },
        getAttrs: (element) => {
          debugger;
          if (typeof element === "string") {
            return false;
          }

          if (element.getAttribute("data-node-type") === "blockGroup") {
            // Null means the element matches, but we don't want to add any attributes to the node.
            return null;
          }
          if (element.parentElement?.tagName === "LI") {
            return null;
          }
          // return null;

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
      blockGroupHTMLAttributes.class
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
