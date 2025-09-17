import { Mapping } from "prosemirror-transform";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import * as Y from "yjs";
import type { ProsemirrorBinding } from "y-prosemirror";

/**
 * This is used to track a mapping for each editor. The mapping stores the mappings for each transaction since the first transaction that was tracked.
 */
const editorToMapping = new Map<BlockNoteEditor<any, any, any>, Mapping>();

/**
 * This initializes a single mapping for an editor instance.
 */
function getMapping(editor: BlockNoteEditor<any, any, any>) {
  if (editorToMapping.has(editor)) {
    // Mapping already initialized, so we don't need to do anything
    return editorToMapping.get(editor)!;
  }
  const mapping = new Mapping();
  editor._tiptapEditor.on("transaction", ({ transaction }) => {
    mapping.appendMapping(transaction.mapping);
  });
  editor._tiptapEditor.on("destroy", () => {
    // Cleanup the mapping when the editor is destroyed
    editorToMapping.delete(editor);
  });

  // There only is one mapping per editor, so we can just set it
  editorToMapping.set(editor, mapping);

  return mapping;
}

/**
 * This is used to keep track of positions of elements in the editor.
 * It is needed because y-prosemirror's sync plugin can disrupt normal prosemirror position mapping.
 *
 * It is specifically made to be able to be used whether the editor is being used in a collaboratively, or single user, providing the same API.
 *
 * @param editor The editor to track the position of.
 * @param position The position to track.
 * @param side The side of the position to track. "left" is the default. "right" would move with the change if the change is in the right direction.
 * @returns A function that returns the position of the element.
 */
export function trackPosition(
  /**
   * The editor to track the position of.
   */
  editor: BlockNoteEditor<any, any, any>,
  /**
   * The position to track.
   */
  position: number,
  /**
   * This is the side of the position to track. "left" is the default. "right" would move with the change if the change is in the right direction.
   */
  side: "left" | "right" = "left",
): () => number {
  const ySyncPluginState = ySyncPluginKey.getState(editor.prosemirrorState) as {
    doc: Y.Doc;
    binding: ProsemirrorBinding;
  };

  if (!ySyncPluginState) {
    // No y-prosemirror sync plugin, so we need to track the mapping manually
    // This will initialize the mapping for this editor, if needed
    const mapping = getMapping(editor);

    // This is the start point of tracking the mapping
    const trackedMapLength = mapping.maps.length;

    return () => {
      const pos = mapping
        // Only read the history of the mapping that we care about
        .slice(trackedMapLength)
        .map(position, side === "left" ? -1 : 1);

      return pos;
    };
  }

  const relativePosition = absolutePositionToRelativePosition(
    // Track the position after the position if we are on the right side
    position + (side === "right" ? 1 : -1),
    ySyncPluginState.binding.type,
    ySyncPluginState.binding.mapping,
  );

  return () => {
    const curYSyncPluginState = ySyncPluginKey.getState(
      editor.prosemirrorState,
    ) as typeof ySyncPluginState;
    const pos = relativePositionToAbsolutePosition(
      curYSyncPluginState.doc,
      curYSyncPluginState.binding.type,
      relativePosition,
      curYSyncPluginState.binding.mapping,
    );

    // This can happen if the element is garbage collected
    if (pos === null) {
      throw new Error("Position not found, cannot track positions");
    }

    return pos + (side === "right" ? -1 : 1);
  };
}
