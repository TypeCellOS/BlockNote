import {
  Node,
  type NodeViewRenderer,
  type NodeViewRendererProps,
} from "@tiptap/core";

import type { Node as PMNode } from "@tiptap/pm/model";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

import { nodeToBlock } from "../api/nodeConversions/nodeToBlock.js";
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
    // Cast: this returns a plain ProseMirror node view, which tiptap's
    // `NodeViewRenderer` type doesn't model.
    return ((props: NodeViewRendererProps) => {
      const editor = this.options.editor;
      const contentType = props.node.firstChild?.type.name;
      const renderFrame = contentType
        ? editor?.blockImplementations?.[contentType]?.implementation
            ?.renderFrame
        : undefined;

      const { dom, contentDOM } = this.type.spec.toDOM!(props.node) as {
        dom: HTMLElement;
        contentDOM: HTMLElement;
      };
      // REVIEW: no React version of renderFrame..
      // A block type can frame its whole block - its content and its nested
      // children together - with markup of its own. Everything renders into
      // the frame's slot, so the frame surrounds both.
      const frame = renderFrame
        ? renderFrame(
            // The node view is on the `blockContainer` itself, so the block is
            // read from its own node rather than resolved through `getPos()`
            // (which can't be trusted mid-reconciliation anyway).
            nodeToBlock(props.node, props.view.state.doc) as any,
            editor as any,
          )
        : undefined;
      if (frame) {
        // REVIEW: desired, or not use `toDOM` at all for the nodeview path?
        contentDOM.appendChild(frame.dom);
      }

      let current = props.node;

      return {
        dom,
        contentDOM: frame ? frame.slot : contentDOM,
        // Whether a block is framed, and by what, follows from the type of its
        // content node - which this node's own markup says nothing about. So a
        // node view is rebuilt whenever that type changes, as well as when
        // ProseMirror would have rebuilt it anyway (a change of markup).
        // Otherwise the frame is told to update itself.
        update: (node: PMNode) => {
          if (
            !node.sameMarkup(current) ||
            node.firstChild?.type.name !== contentType
          ) {
            return false;
          }
          current = node;
          frame?.update?.(nodeToBlock(node, props.view.state.doc) as any);
          return true;
        },
        // The frame's own chrome (a button, a menu) is the author's, not the
        // editor's: ProseMirror would otherwise treat a click on it as a click
        // in the document and swallow it. Everything in the slot stays the
        // editor's.
        stopEvent: (event: Event) => {
          const target = event.target as globalThis.Node | null;
          return (
            !!frame &&
            !!target &&
            frame.dom.contains(target) &&
            !frame.slot.contains(target)
          );
        },
      };
    }) as unknown as NodeViewRenderer;
  },
});
