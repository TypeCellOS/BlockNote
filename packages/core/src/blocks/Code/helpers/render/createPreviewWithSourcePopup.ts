import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from "@floating-ui/dom";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import type { ViewMutationRecord } from "prosemirror-view";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import type { BlockFromConfig } from "../../../../schema/index.js";
import type { CodeBlockConfig } from "../../block.js";
import type {
  CodeBlockOptions,
  CodeBlockPreview,
} from "../../CodeBlockOptions.js";
import { createSourceBlock } from "./createSourceBlock.js";

const getCodeBlockText = (block: BlockFromConfig<any, any, any>): string => {
  const content = block.content;

  if (!Array.isArray(content)) {
    return "";
  }

  return content.map((node) => ("text" in node ? node.text : "")).join("");
};

export const createPreviewWithSourcePopup =
  (options: CodeBlockOptions) =>
  (
    block: BlockFromConfig<any, any, any>,
    editor: BlockNoteEditor<any>,
    createPreview: CodeBlockPreview,
  ) => {
    const dom = document.createElement("div");
    dom.className = "bn-code-block-with-preview";

    // Shows the preview. Always visible & non-editable.
    const previewContainer = document.createElement("div");
    previewContainer.className = "bn-code-block-preview";
    previewContainer.contentEditable = "false";
    dom.appendChild(previewContainer);

    let preview = createPreview(block, editor);
    previewContainer.appendChild(preview.dom);

    // Holds the inline content with source code, shown in a popup below the preview while the
    // selection is within the inline content.
    const source = createSourceBlock(options)(block, editor);
    const sourcePopup = document.createElement("div");
    sourcePopup.className = "bn-code-block-source-popup";
    sourcePopup.style.display = "none";
    sourcePopup.appendChild(source.dom);

    // Shows the preview's error message (e.g. a LaTeX syntax error) below the editable source.
    // Hidden while there's no error.
    const sourceError = document.createElement("div");
    sourceError.className = "bn-code-block-source-error";
    sourceError.contentEditable = "false";
    sourceError.style.display = "none";
    sourcePopup.appendChild(sourceError);

    dom.appendChild(sourcePopup);

    // Reflects the latest preview's error in the source popup's error section.
    const applyPreviewError = (error?: string | null) => {
      sourceError.textContent = error ?? "";
      sourceError.style.display = error ? "block" : "none";
    };
    applyPreviewError(preview.error);

    // Tracks the current source so the preview is only re-rendered when the source actually
    // changes (see `update` below).
    let currentSource = getCodeBlockText(block);

    // Positions the source popup below the preview using FloatingUI, keeping it in place as the
    // preview moves/resizes while visible.
    let cleanupAutoUpdate: (() => void) | undefined;
    const showSourcePopup = () => {
      if (sourcePopup.style.display === "block") {
        return;
      }
      sourcePopup.style.display = "block";
      cleanupAutoUpdate = autoUpdate(previewContainer, sourcePopup, () => {
        computePosition(previewContainer, sourcePopup, {
          placement: "bottom-start",
          middleware: [
            offset(4),
            flip(),
            shift({ padding: 4 }),
            // Match the popup's width to the block. The preview shrink-wraps
            // its rendered content, so we measure the full-width block content
            // element rather than the preview itself.
            size({
              apply({ rects, elements }) {
                const blockContent =
                  previewContainer.closest(".bn-block-content");
                const width =
                  blockContent?.getBoundingClientRect().width ??
                  rects.reference.width;
                elements.floating.style.width = `${width}px`;
              },
            }),
          ],
        }).then(({ x, y }) => {
          sourcePopup.style.left = `${x}px`;
          sourcePopup.style.top = `${y}px`;
        });
      });
    };
    const hideSourcePopup = () => {
      if (sourcePopup.style.display === "none") {
        return;
      }
      sourcePopup.style.display = "none";
      cleanupAutoUpdate?.();
      cleanupAutoUpdate = undefined;
    };

    // Reflects the current selection in the block's UI on every selection
    // change. Two distinct states:
    // - "Editing" (a text cursor inside the content) opens the source popup. A
    //   whole-node selection or a gap cursor beside the block keeps it closed.
    // - "Selected" (the selection is anywhere within the block - the whole node
    //   selected *or* editing) gets the `ProseMirror-selectednode` class, so the
    //   preview shows the standard selected styling in both states. ProseMirror
    //   only adds that class for a whole-node selection, and even strips it once
    //   editing begins (the inner selection isn't a node selection), so we manage
    //   it here. `onSelectionChange` runs after ProseMirror's `deselectNode`, so
    //   the class reliably sticks.
    const updateSelectionState = () => {
      let isSelected = false;
      let isEditing = false;
      try {
        const { selection } = editor.prosemirrorState;
        isSelected = editor.getTextCursorPosition().block.id === block.id;
        isEditing = isSelected && selection instanceof TextSelection;
      } catch {
        isSelected = false;
        isEditing = false;
      }

      if (editor.isEditable && isEditing) {
        showSourcePopup();
      } else {
        hideSourcePopup();
      }

      dom
        .closest(".bn-block-content")
        ?.classList.toggle("ProseMirror-selectednode", isSelected);
    };
    const removeSelectionChangeListener =
      editor.onSelectionChange(updateSelectionState);
    updateSelectionState();

    // The source is hidden inside the popup, so clicking the preview can't
    // place the text cursor in the block on its own. We do it manually, placing
    // the cursor at the content start, which reveals the popup via the selection
    // listener.
    const handlePreviewMouseDown = (event: MouseEvent) => {
      if (!editor.isEditable) {
        return;
      }
      event.preventDefault();
      showSourcePopup();
      editor.setTextCursorPosition(block.id, "start");
      editor.focus();
    };
    previewContainer.addEventListener("mousedown", handlePreviewMouseDown);

    return {
      dom,
      contentDOM: source.contentDOM,
      // Ignores mutations outside the editable source (e.g. preview
      // re-renders), so ProseMirror doesn't try to read them as content.
      ignoreMutation: (mutation: ViewMutationRecord) =>
        !source.contentDOM.contains(mutation.target as Node),
      // Re-renders the preview in place whenever this block's source changes,
      // keeping it in sync without recreating the whole view. ProseMirror
      // only calls this for changes to this block's node, so unlike a global
      // change listener it does no work while other blocks are edited.
      update: (node: ProsemirrorNode) => {
        // The preview layout depends on the language, so let ProseMirror
        // recreate the view (via `render`) when it changes.
        if (node.attrs.language !== block.props.language) {
          return false;
        }

        const text = node.textContent;
        if (text !== currentSource) {
          currentSource = text;

          preview.destroy?.();
          previewContainer.innerHTML = "";
          preview = createPreview(
            editor.getBlock(block.id) as BlockFromConfig<
              CodeBlockConfig,
              any,
              any
            >,
            editor,
          );
          previewContainer.appendChild(preview.dom);
          applyPreviewError(preview.error);
        }

        return true;
      },
      destroy: () => {
        source.destroy();
        removeSelectionChangeListener();
        cleanupAutoUpdate?.();
        preview.destroy?.();
        previewContainer.removeEventListener(
          "mousedown",
          handlePreviewMouseDown,
        );
      },
    };
  };
