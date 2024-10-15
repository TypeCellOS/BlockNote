import { createStronglyTypedTiptapNode } from "../schema/index.js";
import { mergeCSSClasses } from "../util/browser.js";

export const Column = createStronglyTypedTiptapNode({
  name: "column",
  group: "bnBlock childContainer",
  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "blockGroupChild+",
  priority: 40,
  // defining: true, // TODO

  // TODO
  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const attrs: Record<string, string> = {};
          for (const [nodeAttr, HTMLAttr] of Object.entries(BlockAttributes)) {
            if (element.getAttribute(HTMLAttr)) {
              attrs[nodeAttr] = element.getAttribute(HTMLAttr)!;
            }
          }

          if (element.getAttribute("data-node-type") === this.name) {
            return attrs;
          }

          return false;
        },
      },
    ];
  },

  // TODO, needed? + type of attributes
  renderHTML({ HTMLAttributes }) {
    const blockOuter = document.createElement("div");
    blockOuter.className = "bn-block-outer";
    blockOuter.setAttribute("data-node-type", "blockOuter");
    for (const [attribute, value] of Object.entries(HTMLAttributes)) {
      if (attribute !== "class") {
        blockOuter.setAttribute(attribute, value);
      }
    }

    const blockHTMLAttributes = {
      ...(this.options.domAttributes?.block || {}),
      ...HTMLAttributes,
    };
    const block = document.createElement("div");
    block.className = mergeCSSClasses("bn-block", blockHTMLAttributes.class);
    block.setAttribute("data-node-type", this.name);
    for (const [attribute, value] of Object.entries(blockHTMLAttributes)) {
      if (attribute !== "class") {
        block.setAttribute(attribute, value as any); // TODO as any
      }
    }

    blockOuter.appendChild(block);

    return {
      dom: blockOuter,
      contentDOM: block,
    };
  },
});
