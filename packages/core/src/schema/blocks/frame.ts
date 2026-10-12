import { Mark, type Node as PMNode } from "prosemirror-model";
import type { NodeViewRendererProps } from "@tiptap/core";
import type {
  Decoration,
  DecorationSource,
  NodeView,
  ViewMutationRecord,
} from "prosemirror-view";

import { nodeToBlock } from "../../api/nodeConversions/nodeToBlock.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { isDarkReaderMutation } from "../nodeViewMutations.js";
import { applyDataAttributes } from "../dataAttributes.js";
import type { Props, PropSchema } from "../propTypes.js";

/**
 * Marks the element of a frame (see `renderFrame`) where BlockNote mounts the
 * block's content and children. The rest of the frame is chrome, not document
 * content, so the parse rules read only the marked element.
 */
export const FRAME_SLOT_ATTRIBUTE = "data-frame-slot";

export function markFrameSlot(slot: HTMLElement) {
  slot.setAttribute(FRAME_SLOT_ATTRIBUTE, "");
}

/**
 * The frame slot that belongs to `blockElement` (an element with
 * `data-node-type`), or `undefined` when its HTML has no marked slot. The
 * slots of nested blocks are skipped: a slot belongs to the nearest block
 * element around it, and a slot may be that block element itself.
 */
export function findFrameSlot(
  blockElement: HTMLElement,
): HTMLElement | undefined {
  if (blockElement.hasAttribute(FRAME_SLOT_ATTRIBUTE)) {
    return blockElement;
  }
  for (const slot of blockElement.querySelectorAll<HTMLElement>(
    `[${FRAME_SLOT_ATTRIBUTE}]`,
  )) {
    if (slot.closest("[data-node-type]") === blockElement) {
      return slot;
    }
  }
  return undefined;
}

/** The block props whose colors `Block.css` applies to a block's children. */
const BLOCK_COLORS = [
  ["textColor", "data-text-color"],
  ["backgroundColor", "data-background-color"],
] as const;

function isColorSet(value: unknown): value is string {
  return typeof value === "string" && value !== "default";
}

/**
 * Puts a block's text and background color on its element, so they also
 * apply to its children however deep a frame puts its content. Only these
 * two props, which `Block.css` applies to a block's children.
 */
function setBlockColorAttributes(
  element: HTMLElement,
  props: Record<string, unknown>,
) {
  for (const [prop, attribute] of BLOCK_COLORS) {
    const value = props[prop];
    if (isColorSet(value)) {
      element.setAttribute(attribute, value);
    } else {
      element.removeAttribute(attribute);
    }
  }
}

/**
 * Makes the root of a block's frame the block's element: the root gets what
 * CSS and the parse rules read, and the slot gets its marker. A container's
 * root gets all the props of the block as `data-*`. The root of another
 * block replaces the default frame (`.bn-block-outer` and `.bn-block`), so it
 * gets the class of `.bn-block-outer` and the colors of the block.
 */
export function stampFrame(
  frame: { dom: HTMLElement; slot: HTMLElement },
  block: { type: string; id?: string; props: Props<PropSchema> },
  editor: BlockNoteEditor<any, any, any>,
) {
  const { config } = editor.blockImplementations[block.type];
  if (config.container === true) {
    applyDataAttributes(frame.dom, block.props, config.propSchema);
  } else {
    frame.dom.classList.add("bn-block-outer");
    setBlockColorAttributes(frame.dom, block.props);
  }
  // The markers win when a prop maps to the same attribute.
  frame.dom.setAttribute(
    "data-node-type",
    config.container === true ? block.type : "blockContainer",
  );
  if (block.id) {
    frame.dom.setAttribute("data-id", block.id);
  }
  markFrameSlot(frame.slot);
}

/**
 * Draws a block's own frame outside the editor (`renderType: "dom"`), as both
 * HTML serializers do, or returns `undefined` when the block has no frame.
 */
export function renderFrameDOM(
  editor: BlockNoteEditor<any, any, any>,
  block: { type: string } & Record<string, unknown>,
) {
  const spec = editor.blockImplementations[block.type];
  const frame = spec.implementation.renderFrame?.call(
    {
      renderType: "dom",
      props: undefined,
      propSchema: spec.config.propSchema,
    },
    block,
    editor,
  );
  if (!frame && spec.config.container === true) {
    // A container is its frame: without one, nothing of it is left.
    throw new Error(
      `Container block "${block.type}" must draw its frame: \`renderFrame\` returned undefined.`,
    );
  }
  return frame;
}

/**
 * Draws a block's frame for internal HTML: its own frame, stamped, or the
 * default frame of a block that has none (`.bn-block-outer` and `.bn-block`).
 */
export function blockFrameDOM(
  editor: BlockNoteEditor<any, any, any>,
  block: { type: string; id?: string; props: Props<PropSchema> },
) {
  const frame = renderFrameDOM(editor, block);
  if (frame) {
    stampFrame(frame, block, editor);
    return frame;
  }
  const blockContainer = editor.pmSchema.nodes["blockContainer"];
  const { dom, contentDOM } = blockContainer.spec.toDOM!(
    blockContainer.create({ id: block.id }),
  ) as { dom: HTMLElement; contentDOM: HTMLElement };
  setBlockColorAttributes(contentDOM, block.props);
  return { dom, slot: contentDOM };
}

/**
 * A block's frame in the editor (the frame's view, like ProseMirror's
 * `NodeView` for a node): what a block's node view needs from it. React
 * supplies one through the internal `frameView` hook; a vanilla frame
 * (`renderFrame`) gets one from `vanillaFrameView`, and a block without a
 * frame gets the default frame (see `blockFrameView`).
 */
export type FrameView = {
  dom: HTMLElement;
  /** Holds the block's content and children. */
  slot: HTMLElement;
  /**
   * The node the view shows. It changes only when `update` keeps the view:
   * ProseMirror can offer a view that refused a node to the next node.
   */
  readonly node: PMNode;
  /** Updates the frame for the changed node. `false` rebuilds the view. */
  update(
    node: PMNode,
    decorations: readonly Decoration[],
    innerDecorations: DecorationSource,
  ): boolean;
  selectNode?(): void;
  deselectNode?(): void;
  destroy?(): void;
};

type BlockNodeViewArgs = {
  props: NodeViewRendererProps;
  editor: BlockNoteEditor<any, any, any>;
  /**
   * The node that holds the block's type and props: a `blockContainer`'s
   * content node, or a container's own node.
   */
  blockNode: (node: PMNode) => PMNode;
  /**
   * The default frame of a block that draws no frame of its own (a regular
   * block's `.bn-block-outer` and `.bn-block`). Without it, the block must
   * draw a frame.
   */
  defaultFrame?: (node: PMNode) => { dom: HTMLElement; slot: HTMLElement };
};

/**
 * The node view of every block (a `blockContainer` or a container node): its
 * frame's root is the view's `dom`, and its slot holds the content and
 * children. Without a frame of its own, a regular block gets the default
 * frame, and is as fast as ProseMirror's default node view
 * (`performance.test.ts`).
 */
export function frameNodeView(args: BlockNodeViewArgs): NodeView {
  const frame = blockFrameView(args);
  return {
    dom: frame.dom,
    contentDOM: frame.slot,
    update(node, decorations, innerDecorations) {
      if (
        node.attrs.id !== frame.node.attrs.id ||
        !Mark.sameSet(node.marks, frame.node.marks)
      ) {
        // Another block, or other marks, like ProseMirror's default. Return
        // `false`: draw the block again. (ProseMirror offers a view whose
        // node is gone to the next node of the same type.)
        return false;
      }
      // The same block. Return the frame's answer: `true` keeps the view.
      return frame.update(node, decorations, innerDecorations);
    },
    stopEvent: (event) => isFrameChromeEvent(frame, event),
    ignoreMutation: (mutation) => isFrameRenderingMutation(frame, mutation),
    selectNode: frame.selectNode?.bind(frame),
    deselectNode: frame.deselectNode?.bind(frame),
    destroy: frame.destroy?.bind(frame),
  };
}

/**
 * The frame view of a block: React's (the internal `frameView` hook), or else
 * the view of its vanilla `renderFrame`, or else the default frame. A frame
 * belongs to one block type, and whether a block declines its frame depends
 * only on its props.
 */
function blockFrameView(args: BlockNodeViewArgs): FrameView {
  const { props, editor, blockNode, defaultFrame } = args;

  // The block's own frame view for `node`, or `undefined` when it draws none.
  function draw(node: PMNode) {
    const nodeProps = node === props.node ? props : { ...props, node };
    const { implementation } =
      editor.blockImplementations[blockNode(node).type.name];
    return implementation.frameView
      ? implementation.frameView(nodeProps)
      : vanillaFrameView({ ...args, props: nodeProps });
  }

  const frame = draw(props.node);
  if (frame) {
    return frame;
  }
  if (!defaultFrame) {
    throw new Error(
      `Block "${blockNode(props.node).type.name}" must draw its frame: \`renderFrame\` returned undefined.`,
    );
  }

  // The default frame. A new `.bn-block` has no color attributes, so a block
  // with the default colors needs no DOM calls. Skipping them keeps typing in
  // large documents fast (`performance.test.ts`).
  const { dom, slot } = defaultFrame(props.node);
  const attrs = blockNode(props.node).attrs;
  if (BLOCK_COLORS.some(([prop]) => isColorSet(attrs[prop]))) {
    setBlockColorAttributes(slot, attrs);
  }
  let current = props.node;
  return {
    dom,
    slot,
    get node() {
      return current;
    },
    update(node) {
      if (!blockNode(node).sameMarkup(blockNode(current))) {
        // The type or the props changed. Ask the block again.
        const asked = draw(node);
        if (asked) {
          // The block now draws a frame. Return `false`: draw the block
          // again.
          asked.destroy?.();
          return false;
        }
        setBlockColorAttributes(slot, blockNode(node).attrs);
      }
      // The block still draws no frame. Return `true`: keep the default
      // frame. The content and children stay, also when the type changes.
      current = node;
      return true;
    },
  };
}

/**
 * The frame view of a block's vanilla `renderFrame`: draws the frame in the
 * editor and keeps it current, or returns `undefined` when the block draws no
 * frame. A frame that shows more than the block's props needs an update hook.
 */
function vanillaFrameView(args: BlockNodeViewArgs): FrameView | undefined {
  const { props, editor, blockNode } = args;
  const spec = editor.blockImplementations[blockNode(props.node).type.name];
  const renderFrame = spec.implementation.renderFrame;
  if (!renderFrame) {
    // The block type has no frame. Return `undefined`: no frame.
    return undefined;
  }
  const block = nodeToBlock(props.node, props.view.state.doc);
  const frame = renderFrame.call(
    { renderType: "nodeView", props, propSchema: spec.config.propSchema },
    block,
    editor,
  );
  if (!frame) {
    // The block declined its frame. Return `undefined`: no frame.
    return undefined;
  }
  // The block drew its frame. Its root is the block's element.
  stampFrame(frame, block, editor);

  let current = props.node;
  return {
    dom: frame.dom,
    slot: frame.slot,
    get node() {
      return current;
    },
    update(node) {
      const before = blockNode(current);
      const after = blockNode(node);
      if (after.type !== before.type) {
        // A frame belongs to one block type. Return `false`: draw the block
        // again.
        return false;
      }
      if (frame.update) {
        // The frame patches itself.
        const block = nodeToBlock(node, props.view.state.doc);
        if (frame.update(block) === false) {
          // The frame cannot show the block. Return `false`: draw the block
          // again.
          return false;
        }
        stampFrame(frame, block, editor);
      } else if (!after.sameMarkup(before)) {
        // The props changed, and the frame cannot patch itself. Return
        // `false`: draw the block again.
        return false;
      }
      // The frame shows the block. Return `true`: keep the frame.
      current = node;
      return true;
    },
    destroy: () => frame.destroy?.(),
  };
}

// Events on the chrome that ProseMirror still handles: drag-and-drop, so a
// block dropped on the chrome drops where the drop cursor shows it, and the
// clipboard, so a copy that starts in the chrome copies the selection.
const editorEvents = new Set([
  "dragenter",
  "dragover",
  "dragleave",
  "drop",
  "copy",
  "cut",
  "paste",
]);

/**
 * Whether ProseMirror leaves an event alone: it happened on the frame's
 * chrome (inside the frame, outside its slot), which handles its own events.
 * Drag-and-drop and clipboard events still go to ProseMirror (see
 * `editorEvents`).
 */
export function isFrameChromeEvent(
  frame: Pick<FrameView, "dom" | "slot">,
  event: Event,
): boolean {
  const target = event.target;
  return (
    target instanceof globalThis.Node &&
    frame.dom.contains(target) &&
    !frame.slot.contains(target) &&
    !editorEvents.has(event.type)
  );
}

/**
 * Whether ProseMirror ignores a DOM change in a framed block: a change to the
 * frame's chrome or to the slot element's own attributes is the frame's
 * rendering, and Dark Reader's rewrites are not edits either. Changes inside
 * the slot (the block's content and children) and selection changes are
 * read.
 */
export function isFrameRenderingMutation(
  frame: Pick<FrameView, "dom" | "slot">,
  mutation: ViewMutationRecord,
): boolean {
  if (mutation.type === "selection") {
    return false;
  }
  if (isDarkReaderMutation(mutation)) {
    return true;
  }
  if (mutation.target === frame.slot && mutation.type === "attributes") {
    return true;
  }
  return (
    frame.dom.contains(mutation.target) && !frame.slot.contains(mutation.target)
  );
}
