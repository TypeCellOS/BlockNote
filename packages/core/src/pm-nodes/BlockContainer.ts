import {
  Node,
  type NodeViewRenderer,
  type NodeViewRendererProps,
} from "@tiptap/core";
import type { NodeView } from "@tiptap/pm/view";

import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import {
  blockFrameView,
  findFrameSlot,
  frameNodeViewHooks,
} from "../schema/blocks/frame.js";
import { BlockNoteDOMAttributes } from "../schema/index.js";
import { mergeCSSClasses } from "../util/browser.js";
import { suggestionMarks } from "./suggestionMarks.js";

/** The block props whose colors `Block.css` applies to a block's children. */
const BLOCK_COLORS = [
  ["textColor", "data-text-color"],
  ["backgroundColor", "data-background-color"],
] as const;

function isColorSet(value: unknown): value is string {
  return typeof value === "string" && value !== "default";
}

/** Whether a block has a text or background color other than the default. */
function hasBlockColors(props: Record<string, unknown>) {
  return BLOCK_COLORS.some(([prop]) => isColorSet(props[prop]));
}

/**
 * Puts a block's text and background color on its own element (`.bn-block`),
 * so they also apply to its children however deep a frame puts its content.
 * Only these two props, which `Block.css` applies to a block's children.
 */
export function setBlockColorAttributes(
  element: HTMLElement,
  props: Record<string, unknown> | undefined,
) {
  for (const [prop, attribute] of BLOCK_COLORS) {
    const value = props?.[prop];
    if (isColorSet(value)) {
      element.setAttribute(attribute, value);
    } else {
      element.removeAttribute(attribute);
    }
  }
}

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
        tag: "div[data-node-type=" + this.name + "]",
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
    // Every block gets this node view: it draws the block's frame (or none),
    // keeps it current, and keeps the block's colors on `.bn-block`. Without
    // a frame, it is as fast as ProseMirror's default (`performance.test.ts`).
    // Cast: this returns a plain ProseMirror node view, which tiptap's
    // `NodeViewRenderer` type doesn't model.
    return ((props: NodeViewRendererProps) => {
      const { dom, contentDOM: block } = this.type.spec.toDOM!(props.node) as {
        dom: HTMLElement;
        contentDOM: HTMLElement;
      };
      const editor = this.options.editor;
      // The block's frame: React draws its own, otherwise the block's
      // vanilla `renderFrame`. A drawn frame goes inside `.bn-block`; a block
      // without one keeps its content and children in `.bn-block` itself.
      const frame = blockFrameView({
        props,
        editor,
        blockNode: (node) => node.firstChild!,
        unframed: block,
      });
      if (frame.dom !== block) {
        block.appendChild(frame.dom);
      }
      // A new `.bn-block` has no color attributes, so a block with the default
      // colors needs no DOM calls. Skipping them keeps typing in large
      // documents fast (`performance.test.ts`).
      const attrs = props.node.firstChild!.attrs;
      if (hasBlockColors(attrs)) {
        setBlockColorAttributes(block, attrs);
      }

      const nodeView: NodeView = {
        dom,
        contentDOM: frame.slot,
        update(node, decorations, innerDecorations) {
          const before = frame.node;
          // Like ProseMirror's default, the view is rebuilt when the block's
          // own attributes change (another block), and otherwise kept while
          // ProseMirror updates the content and children. It is also rebuilt
          // when the frame no longer fits, for example after a change of the
          // block's type or props.
          if (
            !node.sameMarkup(before) ||
            !frame.update(node, decorations, innerDecorations)
          ) {
            return false;
          }
          // `Block.css` applies a block's colors to its children too, from
          // its element. They are props, so only a prop change moves them.
          if (!node.firstChild!.sameMarkup(before.firstChild!)) {
            setBlockColorAttributes(block, node.firstChild!.attrs);
          }
          return true;
        },
        ...frameNodeViewHooks(frame),
      };
      return nodeView;
    }) as unknown as NodeViewRenderer;
  },
});
