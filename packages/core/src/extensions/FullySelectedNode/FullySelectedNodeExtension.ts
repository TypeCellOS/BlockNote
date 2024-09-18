import { Editor, Extension } from "@tiptap/core";
import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos";

// Removes the `ProseMirror-fullyselected` class name from the editor when a
// NodeSelection is active on a block without inline content, but the DOM
// selection is within the node, rather than fully wrapping it. These 2
// scenarios look identical in the editor state, so we need to check the DOM
// selection to differentiate them.
const onSelectionChange = (editor: Editor) => {
  const isNodeSelection = "node" in editor.state.selection;
  const selection = document.getSelection();
  if (selection === null) {
    return;
  }

  if (selection.type === "None") {
    if (isNodeSelection) {
      // The browser just reset the selection to None (for example, after single clicking a piece of text within the block),
      // we want to reset the selection to span the entire block
      const blockInfo = getBlockInfoFromPos(
        editor.state.doc,
        editor.state.selection.from
      );
      // TODO: check if fix should be applied for this node

      // set selection to blcok
      const range = document.createRange();
      const blockElement = editor.view.domAtPos(blockInfo.startPos).node;
      console.log("update selection", blockElement);
      range.selectNode(blockElement.firstChild);
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

  // Node selection is active.

  if (!isNodeSelection) {
    editor.view.dom.classList.remove("ProseMirror-fullyselected");
    return;
  }

  const blockInfo = getBlockInfoFromPos(
    editor.state.doc,
    editor.state.selection.from
  );

  // Selected block has no inline content.
  const selectedNodeHasNoContent =
    blockInfo.contentNode.type.spec.content === "";
  if (!selectedNodeHasNoContent) {
    editor.view.dom.classList.remove("ProseMirror-fullyselected");
    return;
  }

  const blockElement = editor.view.domAtPos(blockInfo.startPos).node;

  if (
    // Selection doesn't wrap this node.
    selection.type !== "Range" ||
    selection.anchorNode !== blockElement ||
    selection.focusNode !== blockElement ||
    selection.anchorOffset !== 0 ||
    selection.focusOffset !== 1
  ) {
    editor.view.dom.classList.remove("ProseMirror-fullyselected");
  } else if (!editor.view.dom.classList.contains("ProseMirror-fullyselected")) {
    editor.view.dom.classList.add("ProseMirror-fullyselected");
  }
};

export const FullySelectedNodeExtension = Extension.create({
  name: "fullySelectedNode",
  onCreate() {
    document.addEventListener("selectionchange", () => {
      onSelectionChange(this.editor);
    });
  },
  onDestroy() {
    document.removeEventListener("selectionchange", () => {
      onSelectionChange(this.editor);
    });
  },
});
