import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from "@floating-ui/dom";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { ViewMutationRecord } from "prosemirror-view";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import type { BlockFromConfig, StyledText } from "../../../../schema/index.js";
import { createSourceBlock } from "./createSourceBlock.js";
import { CodeBlockPreview } from "../../CodeBlockOptions.js";

// Element shown instead of the preview when block has no content.
const createAddSourceButton = (editor: BlockNoteEditor<any>) => {
  const addSourceButton = document.createElement("div");
  addSourceButton.className = "bn-add-source-code-button";
  addSourceButton.contentEditable = "false";

  const addSourceButtonIcon = document.createElement("div");
  addSourceButtonIcon.className = "bn-add-source-code-button-icon";
  addSourceButtonIcon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12l-5.657 5.657-1.414-1.414L21.172 12l-4.243-4.243 1.414-1.414L24 12zM2.828 12l4.243 4.243-1.414 1.414L0 12l5.657-5.657 1.414 1.414L2.828 12z"></path></svg>';
  addSourceButton.appendChild(addSourceButtonIcon);

  const addSourceButtonText = document.createElement("p");
  addSourceButtonText.className = "bn-add-source-code-button-text";
  addSourceButtonText.textContent =
    editor.dictionary.code_block.add_source_button_text;
  addSourceButton.appendChild(addSourceButtonText);

  return { dom: addSourceButton };
};

// Handles toggling popup visibility using the keyboard. and keyboard navigation while popup is
// hidden.
const handleKeyboardNavigation = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any>,
  isSourcePopupOpen: () => boolean,
  setSourcePopupOpen: (open: boolean) => void,
) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!editor.isEditable) {
      return;
    }

    if (editor.getTextCursorPosition().block.id !== block.id) {
      return;
    }

    // Toggles popup visibility.
    if (event.key === "Enter") {
      editor.setTextCursorPosition(block.id, "end");
      setSourcePopupOpen(!isSourcePopupOpen());

      event.preventDefault();
      event.stopImmediatePropagation();

      return;
    }

    // Hides popup.
    if (event.key === "Escape") {
      if (!isSourcePopupOpen()) {
        return;
      }

      editor.setTextCursorPosition(block.id, "end");
      setSourcePopupOpen(false);

      event.preventDefault();
      event.stopImmediatePropagation();

      return;
    }

    // While popup is hidden, moves selection straight to previous/next block.
    if (
      (event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight") &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      if (isSourcePopupOpen()) {
        return;
      }

      const direction =
        event.key === "ArrowUp" || event.key === "ArrowLeft" ? "prev" : "next";

      const { prevBlock, nextBlock } = editor.getTextCursorPosition();
      const targetBlock = direction === "prev" ? prevBlock : nextBlock;
      if (!targetBlock) {
        return;
      }

      editor.setTextCursorPosition(
        targetBlock.id,
        direction === "prev" ? "end" : "start",
      );

      event.preventDefault();
      event.stopImmediatePropagation();
    }

    // While popup is hidden, prevents editing of block content.
    // TODO: This doesn't account for all cases, e.g. cut/paste with Cmd+X/Cmd+V.
    if (
      (event.key.length === 1 && !event.ctrlKey && !event.metaKey) ||
      event.key === "Backspace" ||
      event.key === "Delete" ||
      event.key === "Tab"
    ) {
      if (isSourcePopupOpen()) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  editor.domElement?.addEventListener("keydown", handleKeyDown, true);

  return {
    destroy: () =>
      editor.domElement?.removeEventListener("keydown", handleKeyDown, true),
  };
};

// Handles opening the popup when clicking the preview.
const handlePreviewMouseDown = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any>,
  preview: HTMLElement,
  setSourcePopupOpen: (open: boolean) => void,
) => {
  const handleMouseDown = (event: MouseEvent) => {
    if (!editor.isEditable) {
      return;
    }

    setSourcePopupOpen(true);

    event.preventDefault();
    event.stopPropagation();

    editor.setTextCursorPosition(block.id, "end");
    editor.focus();
  };

  preview.addEventListener("mousedown", handleMouseDown);

  return {
    destroy: () => preview.removeEventListener("mousedown", handleMouseDown),
  };
};

// Handles closing the popup when selection moves outside of the block, and makes the block appear
// selected while the selection is anywhere inside it.
const handleSelectionChange = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any>,
  container: HTMLElement,
  isSourcePopupOpen: () => boolean,
  setSourcePopupOpen: (open: boolean) => void,
) => {
  const destroy = editor.onSelectionChange((editor) => {
    const blockContent = container.closest(".bn-block-content");

    if (editor.getTextCursorPosition().block.id !== block.id) {
      if (isSourcePopupOpen()) {
        setSourcePopupOpen(false);
      }

      // Sets selected block styles.
      if (
        blockContent &&
        blockContent.classList.contains("ProseMirror-selectednode")
      ) {
        blockContent.classList.remove("ProseMirror-selectednode");
      }
    } else {
      if (
        blockContent &&
        !blockContent.classList.contains("ProseMirror-selectednode")
      ) {
        blockContent.classList.add("ProseMirror-selectednode");
      }
    }
  });

  return { destroy };
};

// Handles positioning for the popup, including edge cases where it doesn't fit in the viewport.
// TODO: Would be nice to replace this logic with CSS anchors:
// https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/anchor
const positionSourcePopup = (
  preview: HTMLElement,
  sourcePopup: HTMLElement,
) => {
  const destroy = autoUpdate(preview, sourcePopup, async () => {
    const { x, y } = await computePosition(preview, sourcePopup, {
      placement: "bottom-start",
      middleware: [
        offset(4),
        flip(),
        shift({ padding: 4 }),
        // Match the popup's width to the block.
        size({
          apply({ rects, elements }) {
            const blockContent = preview.closest(".bn-block-content");
            const width =
              blockContent?.getBoundingClientRect().width ??
              rects.reference.width;
            elements.floating.style.width = `${width}px`;
          },
        }),
      ],
    });
    sourcePopup.style.left = `${x}px`;
    sourcePopup.style.top = `${y}px`;
  });

  return { destroy };
};

// Renders a preview which can be clicked to show the block's inline content as code in a popup,
// alongside a language picker if multiple languages are supported. If no preview is provided, just
// renders the same thing as `createSourceBlock`.
export const createSourceBlockWithPreview = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any>,
  options?:
    | {
        selectedLanguage: string;
        supportedLanguages: Record<
          string,
          {
            name: string;
            createPreview?: CodeBlockPreview;
          }
        >;
      }
    | {
        createPreview: CodeBlockPreview;
      },
) => {
  if (
    options &&
    "selectedLanguage" in options &&
    !(options.selectedLanguage in options.supportedLanguages)
  ) {
    throw new Error(`Language ${options.selectedLanguage} is not supported.`);
  }

  const sourceBlock = createSourceBlock(
    block,
    editor,
    options && "selectedLanguage" in options ? options : undefined,
  );

  const sourceCode =
    typeof block.content === "string"
      ? block.content
      : Array.isArray(block.content)
        ? (block.content as StyledText<any>[]).map(({ text }) => text).join("")
        : "";

  // Tracks the source the preview was last rendered from, so `update` can tell
  // a source-text change (which it handles in place) from any other update.
  let currentSource = sourceCode;

  const createPreview = options
    ? "createPreview" in options
      ? options.createPreview
      : options.supportedLanguages[options.selectedLanguage].createPreview
    : undefined;

  const preview = createPreview
    ? sourceCode.length > 0
      ? createPreview(block, editor)
      : createAddSourceButton(editor)
    : undefined;

  if (!preview) {
    return sourceBlock;
  }

  const previewWithSourcePopup = document.createElement("div");
  previewWithSourcePopup.className = "bn-preview-with-source-popup";
  previewWithSourcePopup.dataset.open = "false";

  const previewContainer = document.createElement("div");
  previewContainer.className = "bn-preview-container";
  previewContainer.contentEditable = "false";
  previewContainer.appendChild(preview.dom);
  previewWithSourcePopup.appendChild(previewContainer);

  const sourceBlockPopup = document.createElement("div");
  sourceBlockPopup.className = "bn-source-block-popup";
  sourceBlockPopup.appendChild(sourceBlock.dom);

  const errorMessage = "error" in preview && preview.error ? preview.error : "";

  const sourceError = document.createElement("div");
  sourceError.className = "bn-code-block-source-error";
  sourceError.contentEditable = "false";
  sourceError.textContent = errorMessage;
  sourceError.style.display = errorMessage ? "block" : "none";
  sourceBlockPopup.appendChild(sourceError);

  previewWithSourcePopup.appendChild(sourceBlockPopup);

  const isSourcePopupOpen = () =>
    previewWithSourcePopup.dataset.open === "true";
  const setSourcePopupOpen = (open: boolean) =>
    (previewWithSourcePopup.dataset.open = open ? "true" : "false");

  const keyboardNavigationHandler = handleKeyboardNavigation(
    block,
    editor,
    isSourcePopupOpen,
    setSourcePopupOpen,
  );

  const previewMouseDownHandler = handlePreviewMouseDown(
    block,
    editor,
    previewContainer,
    setSourcePopupOpen,
  );

  const selectionMoveOutHandler = handleSelectionChange(
    block,
    editor,
    previewWithSourcePopup,
    isSourcePopupOpen,
    setSourcePopupOpen,
  );

  const sourcePopupPositioner = positionSourcePopup(
    previewContainer,
    sourceBlockPopup,
  );

  return {
    dom: previewWithSourcePopup,
    contentDOM: sourceBlock.contentDOM,
    ignoreMutation: (mutation: ViewMutationRecord) =>
      // Ignore mutations outside of the inline content container. Used mainly to ignore DOM
      // changes caused preview updates.
      !sourceBlock.contentDOM.parentElement ||
      !sourceBlock.contentDOM.parentElement.contains(mutation.target),
    update: (node: ProsemirrorNode) => {
      // Always returns `false` and recreates the view when an update was triggered but the block's
      // text content didn't change. If the text content did change and the preview didn't return
      // an error, returns `true` preventing the view from getting recreated, and updates the
      // preview in-place.
      const newSource = node.textContent;
      if (newSource === currentSource) {
        return false;
      }
      currentSource = newSource;

      if (!createPreview) {
        return false;
      }

      const currentBlock = editor.getBlock(block.id);
      if (!currentBlock) {
        return false;
      }

      const preview =
        newSource.length > 0
          ? createPreview(
              currentBlock as BlockFromConfig<any, any, any>,
              editor,
            )
          : createAddSourceButton(editor);

      const errorMessage =
        "error" in preview && preview.error ? preview.error : "";
      if (!errorMessage) {
        previewContainer.replaceChildren(preview.dom);
      }

      sourceError.textContent = errorMessage;
      sourceError.style.display = errorMessage ? "block" : "none";

      return true;
    },
    destroy: () => {
      sourceBlock.destroy();
      keyboardNavigationHandler.destroy();
      previewMouseDownHandler.destroy();
      selectionMoveOutHandler.destroy();
      sourcePopupPositioner.destroy();
    },
  };
};
