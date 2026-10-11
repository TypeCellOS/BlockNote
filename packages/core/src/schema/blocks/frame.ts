import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

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
 * Draws a block's frame outside the editor (`renderType: "dom"`), as both
 * HTML serializers do. A container's frame comes stamped with its block's
 * attributes and slot marker (see `renderContainerFrame` in `createSpec.ts`).
 */
export function renderFrameDOM(
  editor: BlockNoteEditor<any, any, any>,
  block: { type: string } & Record<string, unknown>,
) {
  const spec = editor.blockImplementations[block.type];
  return spec.implementation.renderFrame?.call(
    {
      renderType: "dom",
      props: undefined,
      propSchema: spec.config.propSchema,
    },
    block,
    editor,
  );
}
