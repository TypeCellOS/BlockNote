import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import { Selection, TextSelection } from "prosemirror-state";
import type { EditorView, ViewMutationRecord } from "prosemirror-view";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import type { CustomInlineContentFromConfig } from "../../../../schema/index.js";
import { CodeBlockPreview } from "../../CodeBlockOptions.js";
import { createSourceInlineContent } from "./createSourceInlineContent.js";

// Element shown instead of the preview when the inline content has no source.
const createAddSourceInlineContent = (editor: BlockNoteEditor<any>) => {
  const addSource = document.createElement("span");
  addSource.className = "bn-inline-add-source";
  addSource.contentEditable = "false";
  addSource.textContent = editor.dictionary.code_block.add_source_button_text;

  return { dom: addSource };
};

// The document range covered by the inline content's source (its `contentDOM`).
// This replaces the block version's reliance on `block.id`: an inline content
// is addressed by its position in the document, not by an ID.
const getSourceRange = (view: EditorView, contentDOM: HTMLElement) => ({
  from: view.posAtDOM(contentDOM, 0),
  to: view.posAtDOM(contentDOM, contentDOM.childNodes.length),
});

// Whether the text cursor is currently inside the inline content's source.
const isCursorInSource = (view: EditorView, contentDOM: HTMLElement) => {
  const { from, to } = getSourceRange(view, contentDOM);
  const selection = view.state.selection;

  return selection.from >= from && selection.to <= to;
};

// Places the text cursor at the end of the source, ready for editing.
const moveCursorToSource = (
  editor: BlockNoteEditor<any>,
  view: EditorView,
  contentDOM: HTMLElement,
) => {
  const { to } = getSourceRange(view, contentDOM);

  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, to)),
  );
  editor.focus();
};

// Handles toggling popup visibility using the keyboard, and keyboard navigation
// out of the inline content while the popup is hidden.
const handleKeyboardNavigation = (
  contentDOM: HTMLElement,
  editor: BlockNoteEditor<any>,
  isSourcePopupOpen: () => boolean,
  setSourcePopupOpen: (open: boolean) => void,
) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const view = editor.prosemirrorView;

    if (!editor.isEditable || !view) {
      return;
    }

    if (!isCursorInSource(view, contentDOM)) {
      return;
    }

    // Toggles popup visibility.
    if (event.key === "Enter") {
      moveCursorToSource(editor, view, contentDOM);
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

      moveCursorToSource(editor, view, contentDOM);
      setSourcePopupOpen(false);

      event.preventDefault();
      event.stopImmediatePropagation();

      return;
    }

    // While the popup is hidden, moves the selection straight out of the inline
    // content rather than navigating its hidden source.
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
        event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? "before"
          : "after";

      const { from, to } = getSourceRange(view, contentDOM);
      // The inline node spans `[from - 1, to + 1]`; `Selection.near` snaps to
      // the nearest valid cursor position just outside it, handling document
      // edges and neighbouring text/blocks uniformly.
      const target = direction === "before" ? from - 1 : to + 1;
      const selection = Selection.near(
        view.state.doc.resolve(target),
        direction === "before" ? -1 : 1,
      );

      if (selection.eq(view.state.selection)) {
        return;
      }

      view.dispatch(view.state.tr.setSelection(selection));

      event.preventDefault();
      event.stopImmediatePropagation();

      return;
    }

    // While the popup is hidden, prevents editing the (hidden) source.
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

  // Attached to the document (capture phase) rather than the editor's DOM, as
  // the editor view may not be mounted yet when the inline content first
  // renders.
  document.addEventListener("keydown", handleKeyDown, true);

  return {
    destroy: () => document.removeEventListener("keydown", handleKeyDown, true),
  };
};

// Handles opening the popup when clicking the preview.
const handlePreviewMouseDown = (
  contentDOM: HTMLElement,
  editor: BlockNoteEditor<any>,
  preview: HTMLElement,
  setSourcePopupOpen: (open: boolean) => void,
) => {
  const handleMouseDown = (event: MouseEvent) => {
    const view = editor.prosemirrorView;

    if (!editor.isEditable || !view) {
      return;
    }

    setSourcePopupOpen(true);

    event.preventDefault();
    event.stopPropagation();

    moveCursorToSource(editor, view, contentDOM);
  };

  preview.addEventListener("mousedown", handleMouseDown);

  return {
    destroy: () => preview.removeEventListener("mousedown", handleMouseDown),
  };
};

// Handles closing the popup when the selection moves out of the inline content,
// and makes it appear selected while the selection is inside it.
const handleSelectionChange = (
  dom: HTMLElement,
  contentDOM: HTMLElement,
  editor: BlockNoteEditor<any>,
  isSourcePopupOpen: () => boolean,
  setSourcePopupOpen: (open: boolean) => void,
) => {
  const destroy = editor.onSelectionChange(() => {
    const view = editor.prosemirrorView;

    if (!view) {
      return;
    }

    if (!isCursorInSource(view, contentDOM)) {
      if (isSourcePopupOpen()) {
        setSourcePopupOpen(false);
      }

      dom.classList.remove("ProseMirror-selectednode");
    } else {
      dom.classList.add("ProseMirror-selectednode");
    }
  });

  return { destroy };
};

// Handles positioning for the popup, including edge cases where it doesn't fit
// in the viewport.
const positionSourcePopup = (
  preview: HTMLElement,
  sourcePopup: HTMLElement,
) => {
  const destroy = autoUpdate(preview, sourcePopup, async () => {
    const { x, y } = await computePosition(preview, sourcePopup, {
      placement: "bottom-start",
      middleware: [offset(4), flip(), shift({ padding: 4 })],
    });
    sourcePopup.style.left = `${x}px`;
    sourcePopup.style.top = `${y}px`;
  });

  return { destroy };
};

// Inline-content equivalent of `createSourceBlockWithPreview`. Renders a preview
// which can be clicked (or navigated into with the keyboard) to show the inline
// content's source as code in a popup.
export const createSourceInlineContentWithPreview = (
  inlineContent: CustomInlineContentFromConfig<any, any>,
  editor: BlockNoteEditor<any>,
  options: {
    createPreview: CodeBlockPreview;
  },
) => {
  const sourceInlineContent = createSourceInlineContent(inlineContent, editor);
  const contentDOM = sourceInlineContent.contentDOM;

  const sourceCode =
    typeof inlineContent.content === "string"
      ? inlineContent.content
      : Array.isArray(inlineContent.content)
        ? inlineContent.content.map((node: any) => node.text ?? "").join("")
        : "";

  // Tracks the source the preview was last rendered from, so `update` can tell
  // a source-text change (which it handles in place) from any other update.
  let currentSource = sourceCode;

  const { createPreview } = options;

  // The preview function is the block-oriented `CodeBlockPreview`, so the source
  // text is wrapped in a minimal block-like `{ content }` object.
  const renderPreview = (source: string) =>
    source.length > 0
      ? createPreview({ content: source } as any, editor)
      : createAddSourceInlineContent(editor);

  const preview = renderPreview(sourceCode);

  const previewWithSourcePopup = document.createElement("span");
  previewWithSourcePopup.className = "bn-inline-source-content";
  previewWithSourcePopup.dataset.open = "false";

  const previewContainer = document.createElement("span");
  previewContainer.className = "bn-inline-source-preview";
  previewContainer.contentEditable = "false";
  previewContainer.appendChild(preview.dom);
  previewWithSourcePopup.appendChild(previewContainer);

  const sourceBlockPopup = document.createElement("div");
  sourceBlockPopup.className = "bn-source-block-popup";
  sourceBlockPopup.appendChild(sourceInlineContent.dom);

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
    contentDOM,
    editor,
    isSourcePopupOpen,
    setSourcePopupOpen,
  );

  const previewMouseDownHandler = handlePreviewMouseDown(
    contentDOM,
    editor,
    previewContainer,
    setSourcePopupOpen,
  );

  const selectionChangeHandler = handleSelectionChange(
    previewWithSourcePopup,
    contentDOM,
    editor,
    isSourcePopupOpen,
    setSourcePopupOpen,
  );

  const sourcePopupPositioner = positionSourcePopup(
    previewContainer,
    sourceBlockPopup,
  );

  return {
    dom: previewWithSourcePopup,
    contentDOM,
    ignoreMutation: (mutation: ViewMutationRecord) =>
      // Ignore mutations outside of the source container (mainly DOM changes
      // caused by preview updates).
      !contentDOM.parentElement ||
      !contentDOM.parentElement.contains(mutation.target),
    update: (node: ProsemirrorNode) => {
      // Always keeps the view (returns `true`): unlike the block version, the
      // node view must not be recreated, as that would reset the popup's
      // open/closed state mid-edit. The preview is re-rendered in place only
      // when the source text actually changed.
      const newSource = node.textContent;
      if (newSource === currentSource) {
        return true;
      }
      currentSource = newSource;

      const preview = renderPreview(newSource);

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
      sourceInlineContent.destroy();
      keyboardNavigationHandler.destroy();
      previewMouseDownHandler.destroy();
      selectionChangeHandler.destroy();
      sourcePopupPositioner.destroy();
    },
  };
};
