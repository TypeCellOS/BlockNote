import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { ViewMutationRecord } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { BlockFromConfig } from "../../schema/index.js";
import type {
  CodeBlockConfig,
  CodeBlockOptions,
  CodeBlockRenderPreview,
} from "./block.js";
import { createRenderSource } from "./renderSource.js";

/**
 * Gets the plain text content (i.e. the source) of a code block.
 */
function getCodeBlockText(
  block: BlockFromConfig<CodeBlockConfig, any, any>,
): string {
  const content = block.content;

  if (!Array.isArray(content)) {
    return "";
  }

  return content.map((node) => ("text" in node ? node.text : "")).join("");
}

/**
 * Creates a function that renders a preview of the code, showing the editable
 * source in a popup below the preview (positioned via FloatingUI) while the
 * block is selected. The popup reuses `renderSource` for its content.
 */
export function createRenderPreviewWithSourcePopup(options: CodeBlockOptions) {
  const renderSource = createRenderSource(options);

  return (
    block: BlockFromConfig<CodeBlockConfig, any, any>,
    editor: BlockNoteEditor<any>,
    renderPreview: CodeBlockRenderPreview,
  ) => {
    const dom = document.createElement("div");
    dom.className = "bn-code-block-with-preview";

    // Shows the rendered preview. Always visible & never editable.
    const previewContainer = document.createElement("div");
    previewContainer.className = "bn-code-block-preview";
    previewContainer.contentEditable = "false";
    dom.appendChild(previewContainer);

    let preview = renderPreview(block, editor);
    previewContainer.appendChild(preview.dom);

    // Holds the editable source, shown in a popup below the preview when the
    // block is selected.
    const source = renderSource(block, editor);
    const sourcePopup = document.createElement("div");
    sourcePopup.className = "bn-code-block-source-popup";
    sourcePopup.style.display = "none";
    sourcePopup.appendChild(source.dom);
    dom.appendChild(sourcePopup);

    // Tracks the current source so the preview is only re-rendered when the
    // source actually changes (see `update` below).
    let currentSource = getCodeBlockText(block);

    // Positions the source popup below the preview using FloatingUI, keeping
    // it in place as the preview moves/resizes while visible.
    let cleanupAutoUpdate: (() => void) | undefined;
    const showSourcePopup = () => {
      if (sourcePopup.style.display === "block") {
        return;
      }
      sourcePopup.style.display = "block";
      cleanupAutoUpdate = autoUpdate(previewContainer, sourcePopup, () => {
        computePosition(previewContainer, sourcePopup, {
          placement: "bottom-start",
          middleware: [offset(4), flip(), shift({ padding: 4 })],
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

    // Shows the source popup only while the block is selected.
    const updateSourcePopupVisibility = () => {
      let isSelected = false;
      try {
        isSelected = editor.getTextCursorPosition().block.id === block.id;
      } catch {
        isSelected = false;
      }

      if (editor.isEditable && isSelected) {
        showSourcePopup();
      } else {
        hideSourcePopup();
      }
    };
    const removeSelectionChangeListener = editor.onSelectionChange(
      updateSourcePopupVisibility,
    );
    updateSourcePopupVisibility();

    // The source is hidden inside the popup, so clicking the preview can't
    // place the text cursor in the block on its own. We do it manually, which
    // selects the block and reveals the popup via the selection listener.
    const handlePreviewMouseDown = (event: MouseEvent) => {
      if (!editor.isEditable) {
        return;
      }
      event.preventDefault();
      showSourcePopup();
      editor.setTextCursorPosition(block.id, "end");
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
          preview = renderPreview(
            editor.getBlock(block.id) as BlockFromConfig<
              CodeBlockConfig,
              any,
              any
            >,
            editor,
          );
          previewContainer.appendChild(preview.dom);
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
}
