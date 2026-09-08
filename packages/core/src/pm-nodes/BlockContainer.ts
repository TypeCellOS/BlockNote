import {
  Node,
  type NodeViewRenderer,
  type NodeViewRendererProps,
} from "@tiptap/core";

import type { NodeView } from "@tiptap/pm/view";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { nodeToBlock } from "../api/nodeConversions/nodeToBlock.js";
import { isDocumentFragment } from "../schema/blocks/internal.js";
import { BlockNoteDOMAttributes } from "../schema/index.js";
import { ignoreNonContentMutations } from "../schema/nodeViewMutations.js";
import { mergeCSSClasses } from "../util/browser.js";
import { suggestionMarks } from "./suggestionMarks.js";

/** Adapts vanilla frames to the same lifecycle as framework node views. */
function createFrameView(
  props: NodeViewRendererProps,
  editor: BlockNoteEditor,
  fallback: HTMLElement,
  blockContentDOMAttributes: Record<string, string>,
): NodeView {
  const type = props.node.firstChild!.type.name;
  const implementation = editor.blockImplementations[type].implementation;
  if (implementation.frameNodeView) {
    return implementation.frameNodeView(props);
  }

  const renderFrame = implementation.renderFrame;
  const frame = renderFrame?.call(
    {
      renderType: "nodeView",
      props,
      blockContentDOMAttributes,
      propSchema: editor.blockImplementations[type].config.propSchema,
    },
    nodeToBlock(props.node, props.view.state.doc),
    editor,
  );
  let dom = frame?.dom ?? fallback;
  if (isDocumentFragment(dom)) {
    // Node views need a stable element even when the author returns siblings.
    const wrapper = document.createElement("div");
    wrapper.style.display = "contents";
    wrapper.append(dom);
    dom = wrapper;
  }
  return {
    dom,
    contentDOM: frame?.slot ?? fallback,
    update(node) {
      if (frame?.update) {
        frame.update(nodeToBlock(node, props.view.state.doc));
        return true;
      }
      // Declined frames must also be reconsidered when their block changes.
      return !renderFrame || node.eq(props.node);
    },
  };
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
      const { dom, contentDOM } = this.type.spec.toDOM!(props.node) as {
        dom: HTMLElement;
        contentDOM: HTMLElement;
      };
      const frameView = createFrameView(
        props,
        editor,
        contentDOM,
        this.options.domAttributes?.blockContent || {},
      );
      const framed = frameView.dom !== contentDOM;
      if (framed) {
        contentDOM.appendChild(frameView.dom);
      }

      const nodeView: NodeView = {
        dom,
        contentDOM: frameView.contentDOM ?? contentDOM,
        update(node, decorations, innerDecorations) {
          // Changing the wrapper or block type replaces the complete view.
          return (
            node.sameMarkup(props.node) &&
            node.firstChild?.type === props.node.firstChild?.type &&
            (frameView.update?.(node, decorations, innerDecorations) ?? false)
          );
        },
        stopEvent(event) {
          // Author chrome handles its own events; the slot remains editable.
          const target = event.target;
          return (
            (target instanceof globalThis.Node &&
              frameView.dom.contains(target) &&
              !nodeView.contentDOM?.contains(target)) ||
            (frameView.stopEvent?.(event) ?? false)
          );
        },
        destroy: frameView.destroy?.bind(frameView),
        selectNode: frameView.selectNode?.bind(frameView),
        deselectNode: frameView.deselectNode?.bind(frameView),
        ignoreMutation: frameView.ignoreMutation?.bind(frameView),
      };
      if (framed) {
        ignoreNonContentMutations(nodeView);
      }
      return nodeView;
    }) as unknown as NodeViewRenderer;
  },
});
