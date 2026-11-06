import type { Node } from "prosemirror-model";
import { Selection, type SelectionBookmark } from "prosemirror-state";
import { StepMap } from "prosemirror-transform";

import { CHILD_CONTAINER_GROUP } from "../../schema/blocks/children.js";
import { UniqueID } from "../tiptap-extensions/UniqueID/UniqueID.js";
import { MultipleNodeSelection } from "./MultipleNodeSelection.js";

type DragBookmark = {
  token: string;
  bookmark: SelectionBookmark;
  from: number;
  size: number;
};

// Bookmarks contain methods, so they cannot travel in DataTransfer. Retain only
// the latest drag in this realm and use a transfer token to identify it. Drops
// into another document/realm still carry the serializable category fallback.
let dragBookmark: DragBookmark | undefined;

export function captureDragSelection(
  dataTransfer: Pick<DataTransfer, "setData">,
  selection: Selection,
  draggedSelection: Selection,
) {
  dataTransfer.setData(
    "blocknote/selection-type",
    selection.toJSON().type === "text" ? "text" : "block",
  );
  dragBookmark = undefined;
  // A caret/selection in an unrelated block must not be transplanted into the
  // dragged content. In that case retain the previous end-of-drop fallback.
  if (
    draggedSelection.empty ||
    selection.from < draggedSelection.from ||
    selection.to > draggedSelection.to
  ) {
    return;
  }
  const token = UniqueID.options.generateID();
  dragBookmark = {
    token,
    bookmark: selection.getBookmark(),
    from: draggedSelection.from,
    size: draggedSelection.to - draggedSelection.from,
  };
  dataTransfer.setData("blocknote/selection-bookmark", token);
}

export function readDragSelection(
  dataTransfer: Pick<DataTransfer, "getData"> | null,
) {
  const type: "text" | "block" =
    dataTransfer?.getData("blocknote/selection-type") === "block"
      ? "block"
      : "text";
  const saved =
    dragBookmark?.token ===
    dataTransfer?.getData("blocknote/selection-bookmark")
      ? dragBookmark
      : undefined;

  return { type, restore };

  function restore(doc: Node, fallback: Selection): Selection {
    // ProseMirror may select text inside the dropped blocks. Expand to their
    // outer boundaries, including within layout blocks and nested block groups.
    // Use the inserted range, not IDs: cross-editor drops can regenerate IDs or
    // collide with IDs already present in the destination document.
    const range = fallback.$from.blockRange(fallback.$to, (node) =>
      node.type.isInGroup(CHILD_CONTAINER_GROUP),
    );
    // A schema conversion may reshape transferred content. Only translate
    // offsets when its span is unchanged; otherwise use a valid fallback.
    if (saved && range && range.end - range.start === saved.size) {
      // Mapping through the deletion would collapse positions inside the
      // source. Translate the bookmark directly to the relocated block span.
      return saved.bookmark
        .map(StepMap.offset(range.start - saved.from))
        .resolve(doc);
    }
    return type === "block" && range
      ? MultipleNodeSelection.create(doc, range.start, range.end)
      : Selection.near(fallback.$to, -1);
  }
}
