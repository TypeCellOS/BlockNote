import type { Slice } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { Plugin } from "prosemirror-state";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { getToggleDropTargetPos, handleToggleDrop } from "./toggleDrop.js";

/** Rendering opts a block into toggle interactions by registering its frame.
 * State is scoped to the editor view, never written into the document. */
export const ToggleExtension = createExtension(() => {
  const frames = new Map<
    string,
    {
      expanded: boolean;
      persist: (expanded: boolean) => void;
      paint: (expanded: boolean) => void;
    }
  >();
  /** Undefined when this block has no mounted toggle frame. */
  function isExpanded(id: string): boolean | undefined {
    return frames.get(id)?.expanded;
  }
  /** Updates the mounted frame and its persistence provider; false if absent. */
  function setExpanded(id: string, expanded: boolean): boolean {
    const frame = frames.get(id);
    if (!frame) {
      return false;
    }
    frame.persist(expanded);
    frame.expanded = expanded;
    frame.paint(expanded);
    return true;
  }
  function register(
    id: string,
    expanded: boolean,
    persist: (expanded: boolean) => void,
    paint: (expanded: boolean) => void,
  ) {
    const frame = { expanded, persist, paint };
    frames.set(id, frame);
    paint(expanded);
    return () => {
      // A replacement frame may have registered before the old one is destroyed.
      if (frames.get(id) === frame) {
        frames.delete(id);
      }
    };
  }
  function getDropTargetPos(
    view: EditorView,
    event: { clientX: number; clientY: number },
    slice: Slice | undefined | null,
  ) {
    return getToggleDropTargetPos(isExpanded, view, event, slice);
  }
  return {
    key: "toggleInteraction",
    isExpanded,
    setExpanded,
    register,
    getDropTargetPos,
    prosemirrorPlugins: [
      new Plugin({
        props: {
          handleDrop(view, event, slice, moved) {
            return handleToggleDrop(
              getDropTargetPos(view, event, slice),
              view,
              event,
              slice,
              moved,
            );
          },
        },
      }),
    ],
  } as const;
});
