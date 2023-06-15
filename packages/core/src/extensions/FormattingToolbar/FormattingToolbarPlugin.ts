import {
  Editor,
  isNodeSelection,
  isTextSelection,
  posToDOMRect,
} from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { BlockNoteEditor, BlockSchema } from "../..";
import {
  FormattingToolbar,
  FormattingToolbarDynamicParams,
  FormattingToolbarFactory,
  FormattingToolbarStaticParams,
} from "./FormattingToolbarFactoryTypes";

// Same as TipTap bubblemenu plugin, but with these changes:
// https://github.com/ueberdosis/tiptap/pull/2596/files
export interface FormattingToolbarPluginProps<BSchema extends BlockSchema> {
  pluginKey: PluginKey;
  tiptapEditor: Editor;
  editor: BlockNoteEditor<BSchema>;
  formattingToolbarFactory: FormattingToolbarFactory<BSchema>;
}

export type FormattingToolbarViewProps<BSchema extends BlockSchema> =
  FormattingToolbarPluginProps<BSchema> & {
    view: EditorView;
  };

export class FormattingToolbarView<BSchema extends BlockSchema> {
  public editor: BlockNoteEditor<BSchema>;
  private ttEditor: Editor;

  public view: EditorView;

  public formattingToolbar: FormattingToolbar;

  public preventHide = false;

  public preventShow = false;

  public toolbarIsOpen = false;

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

  constructor({
    editor,
    tiptapEditor,
    formattingToolbarFactory,
    view,
  }: FormattingToolbarViewProps<BSchema>) {
    this.editor = editor;
    this.ttEditor = tiptapEditor;
    this.view = view;

    this.formattingToolbar = formattingToolbarFactory(this.getStaticParams());

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

  dragstartHandler = () => {
    this.formattingToolbar.hide();
    this.toolbarIsOpen = false;
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

    // Checks if the focus is moving to an element outside the editor. If it is,
    // the toolbar is hidden.
    if (
      // An element is clicked.
      event &&
      event.relatedTarget &&
      // Element is outside the toolbar.
      (this.formattingToolbar.element === (event.relatedTarget as Node) ||
        this.formattingToolbar.element?.contains(event.relatedTarget as Node))
    ) {
      return;
    }

    if (this.toolbarIsOpen) {
      this.formattingToolbar.hide();
      this.toolbarIsOpen = false;
    }
  };

  scrollHandler = () => {
    if (this.toolbarIsOpen) {
      this.formattingToolbar.render(this.getDynamicParams(), false);
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

    // Checks if menu should be shown.
    if (
      this.editor.isEditable &&
      !this.toolbarIsOpen &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      this.formattingToolbar.render(this.getDynamicParams(), true);
      this.toolbarIsOpen = true;

      return;
    }

    // Checks if menu should be updated.
    if (
      this.toolbarIsOpen &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      this.formattingToolbar.render(this.getDynamicParams(), false);
      return;
    }

    // Checks if menu should be hidden.
    if (
      this.toolbarIsOpen &&
      !this.preventHide &&
      (!shouldShow || this.preventShow || !this.editor.isEditable)
    ) {
      this.formattingToolbar.hide();
      this.toolbarIsOpen = false;

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

  getStaticParams(): FormattingToolbarStaticParams<BSchema> {
    return {
      editor: this.editor,
    };
  }

  getDynamicParams(): FormattingToolbarDynamicParams {
    return {
      referenceRect: this.getSelectionBoundingBox(),
    };
  }
}

export const createFormattingToolbarPlugin = <BSchema extends BlockSchema>(
  options: FormattingToolbarPluginProps<BSchema>
) => {
  return new Plugin({
    key: new PluginKey("FormattingToolbarPlugin"),
    view: (view) => new FormattingToolbarView({ view, ...options }),
  });
};
