import { createStronglyTypedTiptapNode } from "../schema";
import { mergeCSSClasses } from "../util/browser";

// Object containing all possible block attributes.
const BlockAttributes: Record<string, string> = {
  blockColor: "data-block-color",
  blockStyle: "data-block-style",
  id: "data-id",
  depth: "data-depth",
  depthChange: "data-depth-change",
};

/**
 * The main "Block node" documents consist of
 * 
 * instead of
 * 
 * <blockContainer>
 *  <blockContent />
 *  <blockGroup>
 *    <blockContainer />
 *    <blockContainer />
 *    <blockContainer />
 *  </blockGroup>
 * </blockContainer>
 * 
 * we have
 * 
 * <columnList>
 *  <blockGroup />
 *  <blockGroup />
 *  <blockGroup />
 * </columnList>
 * 
 * vs 
 * 
 * <columnList>
 *  <blockGroup>
 *    <blockContainer>
 *      <blockGroup />
 *    </blockContainer>
<blockContainer>
 *      <blockGroup />
 *    </blockContainer>
 *  </blockGroup>
 * </columnList>
 * 
 * vs
 * 
 * <columnList>
 *    <blockContainer>
 *      <blockContainer />
 *      <blockContainer />
 *    </blockContainer>
 *    <blockContainer>
 *      <blockGroup />
 *    </blockContainer>
 * </columnList>
 */
export const ColumnList = createStronglyTypedTiptapNode({
  name: "columnList",
  group: "blockContainerGroup", // TODO: technically this means you can have a columnlist inside a column which we probably don't want
  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "column column+", // min two columns
  priority: 40, //should be below blockContainer
  // defining: true, // TODO

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          // TODO: needed? also fix typing
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

  // TODO: needed? also fix typing of attributes
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

export const Column = createStronglyTypedTiptapNode({
  name: "column",

  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "blockContainer+",
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

/**
 * 
- tab inside columns
- clean tab outside columns + test
- updateblock + tests
- drag drop indicators
- resize
- drag drop right / left

- backspace behavior etc
 */
