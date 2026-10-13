import {
  Node,
  type NodeViewRenderer,
  type NodeViewRendererProps,
} from "@tiptap/core";

import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { findFrameSlot, frameNodeView } from "../schema/blocks/frame.js";
import { BlockNoteDOMAttributes } from "../schema/index.js";
import { mergeCSSClasses } from "../util/browser.js";
import { suggestionMarks } from "./suggestionMarks.js";

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
 */
export const BlockContainer = Node.create<{
  domAttributes?: BlockNoteDOMAttributes;
  editor: BlockNoteEditor<any, any, any>;
}>({
  name: "blockContainer",
  group: "blockGroupChild bnBlock",
  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "blockContent blockGroup?",
  // Ensures content-specific keyboard handlers trigger first.
  priority: 50,
  defining: true,
  marks() {
    return suggestionMarks(this.editor);
  },
  parseHTML() {
    return [
      {
        // Any tag: the root of a block's frame is the block's element.
        tag: "[data-node-type=" + this.name + "]",
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

          return attrs;
        },
        // The frame's slot: the rest of a frame is chrome, not document
        // content.
        contentElement: (element) =>
          findFrameSlot(element as HTMLElement) ?? (element as HTMLElement),
      },
      // Ignore `blockOuter` divs, but parse the `blockContainer` divs inside them.
      {
        tag: `div[data-node-type="blockOuter"]`,
        skip: true,
      },
    ];
  },

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
        block.setAttribute(attribute, value);
      }
    }

    blockOuter.appendChild(block);

    return {
      dom: blockOuter,
      contentDOM: block,
    };
  },

  addNodeView() {
    // Every block gets this node view: its frame (see `frameNodeView`). A
    // block without a frame of its own gets the default frame,
    // `.bn-block-outer` and `.bn-block` (`renderHTML`).
    // Cast: this returns a plain ProseMirror node view, which tiptap's
    // `NodeViewRenderer` type doesn't model.
    return ((props: NodeViewRendererProps) =>
      frameNodeView({
        props,
        editor: this.options.editor,
        blockNode: (node) => node.firstChild!,
        defaultFrame: (node) => {
          const { dom, contentDOM } = this.type.spec.toDOM!(node) as {
            dom: HTMLElement;
            contentDOM: HTMLElement;
          };
          return { dom, slot: contentDOM };
        },
      })) as unknown as NodeViewRenderer;
  },
});
