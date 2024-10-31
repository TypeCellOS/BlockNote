import {
  createStronglyTypedTiptapNode,
  mergeCSSClasses,
} from "@blocknote/core";

import { ColumnResizeExtension } from "../extensions/ColumnResize/ColumnResizeExtension.js";

// TODO: necessary?
const BlockAttributes: Record<string, string> = {
  blockColor: "data-block-color",
  blockStyle: "data-block-style",
  id: "data-id",
  depth: "data-depth",
  depthChange: "data-depth-change",
};

export const Column = createStronglyTypedTiptapNode({
  name: "column",
  group: "bnBlock childContainer",
  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "blockContainer+",
  priority: 40,
  // defining: true, // TODO

  addAttributes() {
    return {
      width: {
        // Why does each column have a default width of 1, i.e. 100%? Because
        // when creating a new column, we want to make sure that existing
        // column widths are preserved, while the new one also has a sensible
        // width. If we'd set it so all column widths must add up to 100%
        // instead, then each time a new column is created, we'd have to assign
        // it a width depending on the total number of columns and also adjust
        // the widths of the other columns. The same can be said for using px
        // instead of percent widths and making them add to the editor width. So
        // using this method is both simpler and computationally cheaper. This
        // is possible because we can set the `flex-grow` property to the width
        // value, which handles all the resizing for us, instead of manually
        // having to set the `width` property of each column.
        default: 1,
        parseHTML: (element) => {
          const attr = element.getAttribute("data-width");
          if (attr === null) {
            return null;
          }

          const parsed = parseFloat(attr);
          if (isFinite(parsed)) {
            return parsed;
          }

          return null;
        },
        renderHTML: (attributes) => {
          return {
            "data-width": (attributes.width as number).toString(),
            style: `flex-grow: ${attributes.width as number};`,
          };
        },
      },
    };
  },

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

  renderHTML({ HTMLAttributes }) {
    const blockHTMLAttributes = {
      // TODO: Should the block DOM attributes from the editor options be added
      //  here?
      ...(this.options.domAttributes?.block || {}),
      ...HTMLAttributes,
    };

    const column = document.createElement("div");
    column.className = mergeCSSClasses(
      "bn-block-column",
      blockHTMLAttributes.class
    );
    column.setAttribute("data-node-type", this.name);
    for (const [attribute, value] of Object.entries(blockHTMLAttributes)) {
      if (attribute !== "class") {
        column.setAttribute(attribute, value as any); // TODO as any
      }
    }

    return {
      dom: column,
      contentDOM: column,
    };
  },

  addExtensions() {
    return [ColumnResizeExtension];
  },
});
