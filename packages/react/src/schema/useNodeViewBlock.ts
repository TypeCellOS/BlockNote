import { Block, getBlockFromPos } from "@blocknote/core";
import type { NodeViewProps } from "@tiptap/react";
import { useRef } from "react";

/**
 * Resolves the `Block` that a React node view should render.
 *
 * A node view's `getPos()` is not always usable. ProseMirror computes it by
 * walking the view-desc tree, but `EditorView.updateStateInner` assigns the new
 * state *before* it reconciles that tree, so any render that happens partway
 * through reconciliation sees positions computed against a half-updated tree
 * while `view.state.doc` is already the new document. React node views get
 * rendered in exactly that window: TipTap's `ReactRenderer` calls `flushSync`
 * while mounting a node view, and anything that runs from the resulting commit
 * (a layout effect, a re-entrant dispatch, another node view's pending update)
 * renders with a position that no longer matches the document. `getPos()` can
 * also return `undefined` outright once a desc has been detached.
 *
 * The resulting position is either out of range (`RangeError: Position N out of
 * range`) or in range but pointing at the wrong node (`Node should be a
 * bnBlock, but is instead: doc`) — both thrown out of the render path, which
 * under React 19 tears down the consumer's tree rather than being rethrown.
 *
 * Upstream considers this TipTap's problem (ProseMirror/prosemirror#1532) and
 * TipTap considers `flushSync` unavoidable, so we recover here instead, by
 * reusing the last block we rendered. The bad position is always transient —
 * ProseMirror finishes reconciling and re-renders the node view with a valid
 * one immediately after — so a stale frame is invisible, whereas a throw is
 * not.
 *
 * See BlockNote issues #2937, #2682 and #2621.
 */
export function useNodeViewBlock(
  props: NodeViewProps,
  /**
   * The block core's `addNodeView` resolved when the node view was constructed
   * — via `getBlockFromNodeView`, so it is already guarded against the same
   * problem. Seeds the fallback so there is always a block to render.
   */
  initialBlock: Block<any, any, any>,
): Block<any, any, any> {
  const lastBlockRef = useRef(initialBlock);
  const doc = props.view.state.doc;

  try {
    // Deliberate render-phase write: a monotonic "last good value" cache, so a
    // repeated render (e.g. StrictMode's double invoke) recomputes the same
    // thing.
    lastBlockRef.current = getBlockFromPos(props.getPos, doc);
  } catch {
    // Expected and self-correcting, so deliberately silent: ProseMirror
    // re-renders the node view with a usable position immediately after, and
    // there is nothing a consumer could do about it in the meantime.
  }

  return lastBlockRef.current;
}
