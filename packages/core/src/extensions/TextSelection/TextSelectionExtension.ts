import { Editor, Extension } from "@tiptap/core";
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
    editor.view.dom.classList.remove("ProseMirror-forceshowselection");
    return;
  }

  const selection = document.getSelection();
  if (selection === null) {
    editor.view.dom.classList.remove("ProseMirror-forceshowselection");
    return;
  }

  const blockInfo = getBlockInfoFromPos(
    editor.state.doc,
    editor.state.selection.from
  );

  const selectedBlockHasSelectableText =
    blockSchema[blockInfo.contentType.name].allowTextSelection;
  if (!selectedBlockHasSelectableText) {
    editor.view.dom.classList.remove("ProseMirror-forceshowselection");
    return;
  }

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

  // Sets/unsets the `ProseMirror-forceshowselection` class when the selection
  // is inside the selected node.
  const blockElement = editor.view.domAtPos(blockInfo.startPos).node;

  if (
    // Selection is inside the selected node.
    blockElement.contains(selection.anchorNode) &&
    blockElement.contains(selection.focusNode) &&
    selection.anchorNode !== blockElement &&
    selection.focusNode !== blockElement
  ) {
    editor.view.dom.classList.add("ProseMirror-forceshowselection");
  } else {
    editor.view.dom.classList.remove("ProseMirror-forceshowselection");
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
