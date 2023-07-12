import {
  Editor,
  isNodeSelection,
  isTextSelection,
  posToDOMRect,
} from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import {
  BaseUiElementCallbacks,
  BaseUiElementState,
  BlockNoteEditor,
  BlockSchema,
} from "../..";

export type FormattingToolbarCallbacks = BaseUiElementCallbacks;

export type FormattingToolbarState = BaseUiElementState;

export class FormattingToolbarView<BSchema extends BlockSchema> {
  public editor: BlockNoteEditor<BSchema>;
  private ttEditor: Editor;
  public view: EditorView;

  private formattingToolbarState?: FormattingToolbarState;
  public updateFormattingToolbar: () => void;

  public preventHide = false;
  public preventShow = false;
  public prevWasEditable: boolean | null = null;

  public shouldShow: (props: {
    view: EditorView;
    state: EditorState;
    from: number;
    to: number;
  }) => boolean = ({ view, state, from, to }) => {
    const { doc, selection } = state;
    const { empty } = selection;

    // Sometime check for `empty` is not enough.
    // Doubleclick an empty paragraph returns a node size of 2.
    // So we check also for an empty text size.
    const isEmptyTextBlock =
      !doc.textBetween(from, to).length && isTextSelection(state.selection);

    return !(!view.hasFocus() || empty || isEmptyTextBlock);
  };

  constructor(
    editor: BlockNoteEditor<BSchema>,
    view: EditorView,
    updateFormattingToolbar: (
      formattingToolbarState: FormattingToolbarState
    ) => void
  ) {
    this.view = view;
    this.editor = editor;
    this.ttEditor = editor._tiptapEditor;

    this.updateFormattingToolbar = () => {
      if (!this.formattingToolbarState) {
        throw new Error(
          "Attempting to update uninitialized formatting toolbar"
        );
      }

      updateFormattingToolbar(this.formattingToolbarState);
    };

    this.view.dom.addEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.addEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.addEventListener("dragstart", this.dragstartHandler);

    this.ttEditor.on("focus", this.focusHandler);
    this.ttEditor.on("blur", this.blurHandler);

    document.addEventListener("scroll", this.scrollHandler);
  }

  viewMousedownHandler = () => {
    this.preventShow = true;
  };

  viewMouseupHandler = () => {
    this.preventShow = false;
    setTimeout(() => this.update(this.ttEditor.view));
  };

  // For dragging the whole editor.
  dragstartHandler = () => {
    if (this.formattingToolbarState?.show) {
      this.formattingToolbarState.show = false;
      this.updateFormattingToolbar();
    }
  };

  focusHandler = () => {
    // we use `setTimeout` to make sure `selection` is already updated
    setTimeout(() => this.update(this.ttEditor.view));
  };

  blurHandler = ({ event }: { event: FocusEvent }) => {
    if (this.preventHide) {
      this.preventHide = false;

      return;
    }

    const editorWrapper = this.ttEditor.view.dom.parentElement!;

    // Checks if the focus is moving to an element outside the editor. If it is,
    // the toolbar is hidden.
    if (
      // An element is clicked.
      event &&
      event.relatedTarget &&
      // Element is inside the editor.
      (editorWrapper === (event.relatedTarget as Node) ||
        editorWrapper.contains(event.relatedTarget as Node))
    ) {
      return;
    }

    if (this.formattingToolbarState?.show) {
      this.formattingToolbarState.show = false;
      this.updateFormattingToolbar();
    }
  };

  scrollHandler = () => {
    if (this.formattingToolbarState?.show) {
      this.formattingToolbarState.referencePos = this.getSelectionBoundingBox();
      this.updateFormattingToolbar();
    }
  };

  update(view: EditorView, oldState?: EditorState) {
    const { state, composing } = view;
    const { doc, selection } = state;
    const isSame =
      oldState && oldState.doc.eq(doc) && oldState.selection.eq(selection);

    if (
      (this.prevWasEditable === null ||
        this.prevWasEditable === this.editor.isEditable) &&
      (composing || isSame)
    ) {
      return;
    }

    this.prevWasEditable = this.editor.isEditable;

    // support for CellSelections
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));

    const shouldShow = this.shouldShow?.({
      view,
      state,
      from,
      to,
    });

    // Checks if menu should be shown/updated.
    if (
      this.editor.isEditable &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      this.formattingToolbarState = {
        show: true,
        referencePos: this.getSelectionBoundingBox(),
      };

      this.updateFormattingToolbar();

      return;
    }

    // Checks if menu should be hidden.
    if (
      this.formattingToolbarState?.show &&
      !this.preventHide &&
      (!shouldShow || this.preventShow || !this.editor.isEditable)
    ) {
      this.formattingToolbarState.show = false;
      this.updateFormattingToolbar();

      return;
    }
  }

  destroy() {
    this.view.dom.removeEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.removeEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.removeEventListener("dragstart", this.dragstartHandler);

    this.ttEditor.off("focus", this.focusHandler);
    this.ttEditor.off("blur", this.blurHandler);

    document.removeEventListener("scroll", this.scrollHandler);
  }

  getSelectionBoundingBox() {
    const { state } = this.ttEditor.view;
    const { selection } = state;

    // support for CellSelections
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));

    if (isNodeSelection(selection)) {
      const node = this.ttEditor.view.nodeDOM(from) as HTMLElement;

      if (node) {
        return node.getBoundingClientRect();
      }
    }

    return posToDOMRect(this.ttEditor.view, from, to);
  }
}

export const formattingToolbarPluginKey = new PluginKey(
  "FormattingToolbarPlugin"
);
export const createFormattingToolbar = <BSchema extends BlockSchema>(
  editor: BlockNoteEditor<BSchema>,
  updateFormattingToolbar: (
    formattingToolbarState: FormattingToolbarState
  ) => void
): FormattingToolbarCallbacks => {
  let formattingToolbarView: FormattingToolbarView<BSchema>;

  editor._tiptapEditor.registerPlugin(
    new Plugin({
      key: formattingToolbarPluginKey,
      view: () => {
        if (formattingToolbarView) {
          formattingToolbarView.destroy();
        }

        formattingToolbarView = new FormattingToolbarView(
          editor,
          editor._tiptapEditor.view,
          updateFormattingToolbar
        );
        return formattingToolbarView;
      },
    }),
    // Ensures the plugin is loaded at the highest priority so that things like
    // keyboard handlers work.
    (formattingToolbarPlugin, plugins) => {
      plugins.unshift(formattingToolbarPlugin);
      return plugins;
    }
  );
  return {
    destroy: () =>
      editor._tiptapEditor.unregisterPlugin(formattingToolbarPluginKey),
  };
};
