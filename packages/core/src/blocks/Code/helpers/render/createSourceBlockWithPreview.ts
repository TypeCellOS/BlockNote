import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { ViewMutationRecord } from "prosemirror-view";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import type { BlockFromConfig, StyledText } from "../../../../schema/index.js";
import { createSourceBlock } from "./createSourceBlock.js";
import { CodeBlockPreview } from "../../CodeBlockOptions.js";
import { SourceBlockPreviewExtension } from "../extensions/SourceBlockPreviewExtension.js";

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

  const store = editor.getExtension(SourceBlockPreviewExtension)?.store;

  // Sync the popup's initial open state so it survives a re-render (the block's
  // DOM isn't mounted yet, so the selected class is left to `updateFromStore`).
  previewWithSourcePopup.dataset.open =
    store?.state.popupOpen === block.id ? "true" : "false";

  const unsubscribeFromStore = store?.subscribe(() => {
    previewWithSourcePopup.dataset.open =
      store?.state.popupOpen === block.id ? "true" : "false";
    previewWithSourcePopup
      .closest(".bn-block-content")
      ?.classList.toggle(
        "ProseMirror-selectednode",
        store?.state.selected === block.id,
      );
  });

  // Opens the popup when clicking the preview.
  const handleMouseDown = (event: MouseEvent) => {
    if (!editor.isEditable) {
      return;
    }

    store?.setState((state) => ({ ...state, popupOpen: block.id }));

    event.preventDefault();
    event.stopPropagation();

    editor.setTextCursorPosition(block.id, "end");
    editor.focus();
  };
  previewContainer.addEventListener("mousedown", handleMouseDown);

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
      unsubscribeFromStore?.();
      previewContainer.removeEventListener("mousedown", handleMouseDown);
    },
  };
};
