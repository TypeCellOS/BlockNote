import type { Node as PMNode } from "prosemirror-model";
import type { NodeViewRendererProps } from "@tiptap/core";
import type {
  Decoration,
  DecorationSource,
  ViewMutationRecord,
} from "prosemirror-view";

import { nodeToBlock } from "../../api/nodeConversions/nodeToBlock.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { isDarkReaderMutation } from "../nodeViewMutations.js";
import { applyLayoutBlockAttributes } from "./layoutBlockAttributes.js";
import type { BlockConfig, BlockImplementation } from "./types.js";

/** What a vanilla `renderFrame` returns when it draws a frame. */
type VanillaFrame = NonNullable<
  ReturnType<NonNullable<BlockImplementation["renderFrame"]>>
>;

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

/**
 * Stamps a layout block's frame with what its round-trip parse reads: the
 * block's attributes on the frame's root (the block's element), and the slot
 * marker. Whoever draws a layout block's frame stamps it.
 */
export function stampLayoutFrame(
  blockConfig: BlockConfig<any, any, any>,
  frame: { dom: HTMLElement; slot: HTMLElement },
  block: any,
) {
  applyLayoutBlockAttributes(
    frame.dom,
    blockConfig.type,
    block.props,
    blockConfig.propSchema,
    block.id,
  );
  markFrameSlot(frame.slot);
}

/**
 * Draws a block's frame outside the editor (`renderType: "dom"`), as both
 * HTML serializers do. A layout block's frame comes stamped (see
 * `stampLayoutFrame`).
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
  if (spec.config.layoutOnly === true) {
    if (!frame) {
      // A layout block is its frame: without one, nothing of it is left.
      throw new Error(
        `Layout block "${block.type}" must draw its frame: \`renderFrame\` returned undefined.`,
      );
    }
    stampLayoutFrame(spec.config, frame, block);
  }
  return frame;
}

/**
 * A block's frame in the editor (the frame's view, like ProseMirror's
 * `NodeView` for a node): what a block's node view needs from it. React
 * supplies one through the internal `frameView` hook; a vanilla frame
 * (`renderFrame`) gets one from `vanillaFrameView` (see `blockFrameView`).
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

type FrameViewArgs = {
  props: NodeViewRendererProps;
  editor: BlockNoteEditor<any, any, any>;
  /**
   * The node that holds the block's type and props: a `blockContainer`'s
   * content node, or a layout block's own node.
   */
  blockNode: (node: PMNode) => PMNode;
  /**
   * The element that holds the content and children when the block draws no
   * frame (a block's `.bn-block`). Without it, the block must draw a frame.
   */
  unframed?: HTMLElement;
};

/**
 * The frame view of a block: React's (the internal `frameView` hook), or else
 * the view of its vanilla `renderFrame`.
 */
export function blockFrameView(args: FrameViewArgs): FrameView {
  const { props, editor, blockNode } = args;
  return (
    editor.blockImplementations[
      blockNode(props.node).type.name
    ].implementation.frameView?.(props) ?? vanillaFrameView(args)
  );
}

/**
 * The frame view of a block's vanilla `renderFrame`: draws the frame in the
 * editor and keeps it current. A frame belongs to one block type and depends
 * only on the block's props; a frame that shows more needs an update hook.
 */
function vanillaFrameView(args: FrameViewArgs): FrameView {
  const { props, editor, blockNode, unframed } = args;
  const config = editor.blockImplementations[blockNode(props.node).type.name]
    .config as BlockConfig<any, any, any>;

  // A layout block's frame is stamped after it is drawn or patched (see
  // `stampLayoutFrame`).
  function stamp(frame: VanillaFrame, block: any) {
    if (config.layoutOnly === true) {
      stampLayoutFrame(config, frame, block);
    }
  }

  // The block's `renderFrame`, with the editor's render context.
  function draw(node: PMNode) {
    const spec = editor.blockImplementations[blockNode(node).type.name];
    const renderFrame = spec.implementation.renderFrame;
    if (!renderFrame) {
      // The block type has no frame. Return `undefined`: no frame.
      return undefined;
    }
    const block = nodeToBlock(node, props.view.state.doc);
    const frame = renderFrame.call(
      { renderType: "nodeView", props, propSchema: spec.config.propSchema },
      block,
      editor,
    );
    if (!frame) {
      // The block declined its frame. Return `undefined`: no frame.
      return undefined;
    }
    // The block drew its frame. Return it, stamped when it is a layout block.
    stamp(frame, block);
    return frame;
  }

  const frame = draw(props.node);
  let dom: HTMLElement;
  let slot: HTMLElement;
  if (frame) {
    dom = frame.dom;
    slot = frame.slot;
  } else if (unframed) {
    dom = unframed;
    slot = unframed;
  } else {
    throw new Error(
      `Block "${blockNode(props.node).type.name}" must draw its frame: \`renderFrame\` returned undefined.`,
    );
  }

  let current = props.node;

  return {
    dom,
    slot,
    get node() {
      return current;
    },
    update(node) {
      const before = blockNode(current);
      const after = blockNode(node);
      if (!frame) {
        // The block drew no frame. When its type or props change, ask again.
        const asked = after.sameMarkup(before) ? undefined : draw(node);
        if (asked) {
          // The block now draws a frame. Return `false`: draw the block
          // again.
          asked.destroy?.();
          return false;
        }
        // The block still draws no frame. Return `true`: keep the block.
        // Its content and children stay, also when its type changes.
        current = node;
        return true;
      }
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
        stamp(frame, block);
      } else if (!after.sameMarkup(before)) {
        // The props changed, and the frame cannot patch itself. Return
        // `false`: draw the block again.
        return false;
      }
      // The frame shows the block. Return `true`: keep the frame.
      current = node;
      return true;
    },
    destroy: () => frame?.destroy?.(),
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

/**
 * The node view hooks that come from a block's frame alone: its chrome rules
 * (`isFrameChromeEvent`, `isFrameRenderingMutation`), and its selection and
 * cleanup.
 */
export function frameNodeViewHooks(frame: FrameView) {
  return {
    stopEvent: (event: Event) => isFrameChromeEvent(frame, event),
    ignoreMutation: (mutation: ViewMutationRecord) =>
      isFrameRenderingMutation(frame, mutation),
    selectNode: frame.selectNode?.bind(frame),
    deselectNode: frame.deselectNode?.bind(frame),
    destroy: frame.destroy?.bind(frame),
  };
}
