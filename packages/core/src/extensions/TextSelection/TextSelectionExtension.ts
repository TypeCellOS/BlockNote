import { Editor, Extension } from "@tiptap/core";
import { NodeSelection } from "prosemirror-state";
import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos";
import { BlockSchema } from "../../schema";

// Removes the `ProseMirror-hideselection` class name from the editor when a
// NodeSelection is active on a block with `allowTextSelection`, but the DOM
// selection is within the node, rather than fully wrapping it. These 2
// scenarios look identical in the editor state, so we need to check the DOM
// selection to differentiate them.
export const onSelectionChange = (editor: Editor, blockSchema: BlockSchema) => {
  const isNodeSelection = "node" in editor.state.selection;
  if (!isNodeSelection) {
    editor.view.dom.classList.remove("ProseMirror-hideselection");
    return;
  }

  const selection = document.getSelection();
  if (selection === null) {
    return;
  }

  const blockInfo = getBlockInfoFromPos(
    editor.state.doc,
    editor.state.selection.from
  );

  const selectedBlockHasSelectableText =
    blockSchema[blockInfo.contentType.name].allowTextSelection;

  // We want to ensure that the DOM selection and the editor selection
  // remain in sync. This means that in cases where the editor is focused
  // and a node selection is active, the DOM selection should be reset to
  // wrap the selected node if it's set to None.
  if (selection.type === "None") {
    if (isNodeSelection && selectedBlockHasSelectableText) {
      // Sets selection to wrap block.
      const range = document.createRange();
      const blockElement = editor.view.domAtPos(blockInfo.startPos).node;
      range.selectNode(blockElement.firstChild!);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    return;
  }

  // selectionchange events don't bubble, so we have to scope them in this way
  // instead of setting the listener on the editor element.
  if (
    !editor.view.dom.contains(selection.anchorNode) ||
    !editor.view.dom.contains(selection.focusNode)
  ) {
    return;
  }

  // Replicates default behaviour if the block doesn't have selectable text,
  // i.e. sets the `ProseMirror-hideselection` class whenever a   NodeSelection
  // is active.
  if (!selectedBlockHasSelectableText) {
    editor.view.dom.classList.add("ProseMirror-hideselection");

    return;
  }

  // Uses custom behaviour if the block has selectable text, i.e. only sets the
  // `ProseMirror-hideselection` class when a NodeSelection is active and the
  // DOM selection wraps the selected block.
  const blockElement = editor.view.domAtPos(blockInfo.startPos).node;

  if (
    // Selection doesn't wrap this node.
    selection.type !== "Range" ||
    selection.anchorNode !== blockElement ||
    selection.focusNode !== blockElement ||
    selection.anchorOffset !== 0 ||
    selection.focusOffset !== 1
  ) {
    editor.view.dom.classList.remove("ProseMirror-hideselection");
  } else {
    editor.view.dom.classList.add("ProseMirror-hideselection");
  }
};

export const TextSelectionExtension = Extension.create<{
  blockSchema: BlockSchema;
  onSelectionChange: () => void;
}>({
  name: "textSelection",
  addOptions() {
    return {
      blockSchema: {},
      onSelectionChange: () => {
        // No-op
      },
    };
  },
  onCreate() {
    NodeSelection.prototype.visible = true;
    document.addEventListener(
      "selectionchange",
      this.options.onSelectionChange
    );
  },
  onDestroy() {
    document.removeEventListener(
      "selectionchange",
      this.options.onSelectionChange
    );
  },
});
