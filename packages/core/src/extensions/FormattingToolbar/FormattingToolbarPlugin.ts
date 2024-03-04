import { isNodeSelection, posToDOMRect } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";

export type FormattingToolbarState = UiElementPosition;

export class FormattingToolbarView {
  public state?: FormattingToolbarState;
  public emitUpdate: () => void;

  public preventHide = false;
  public preventShow = false;
  public prevWasEditable: boolean | null = null;

  public shouldShow: (props: {
    view: EditorView;
    state: EditorState;
    from: number;
    to: number;
  }) => boolean = ({ state }) => !state.selection.empty;

  constructor(
    private readonly editor: BlockNoteEditor<
      BlockSchema,
      InlineContentSchema,
      StyleSchema
    >,
    private readonly pmView: EditorView,
    emitUpdate: (state: FormattingToolbarState) => void
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error(
          "Attempting to update uninitialized formatting toolbar"
        );
      }

      emitUpdate(this.state);
    };

    pmView.dom.addEventListener("mousedown", this.viewMousedownHandler);
    pmView.dom.addEventListener("mouseup", this.viewMouseupHandler);
    pmView.dom.addEventListener("dragstart", this.dragHandler);
    pmView.dom.addEventListener("dragover", this.dragHandler);

    pmView.dom.addEventListener("focus", this.focusHandler);
    pmView.dom.addEventListener("blur", this.blurHandler);

    document.addEventListener("scroll", this.scrollHandler);
  }

  viewMousedownHandler = () => {
    this.preventShow = true;
  };

  viewMouseupHandler = () => {
    this.preventShow = false;
    setTimeout(() => this.update(this.pmView));
  };

  // For dragging the whole editor.
  dragHandler = () => {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

  focusHandler = () => {
    // we use `setTimeout` to make sure `selection` is already updated
    setTimeout(() => this.update(this.pmView));
  };

  blurHandler = (event: FocusEvent) => {
    if (this.preventHide) {
      this.preventHide = false;

      return;
    }

    const editorWrapper = this.pmView.dom.parentElement!;

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

    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

  scrollHandler = () => {
    if (this.state?.show) {
      this.state.referencePos = this.getSelectionBoundingBox();
      this.emitUpdate();
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
      this.state = {
        show: true,
        referencePos: this.getSelectionBoundingBox(),
      };

      this.emitUpdate();

      return;
    }

    // Checks if menu should be hidden.
    if (
      this.state?.show &&
      !this.preventHide &&
      (!shouldShow || this.preventShow || !this.editor.isEditable)
    ) {
      this.state.show = false;
      this.emitUpdate();

      return;
    }
  }

  destroy() {
    this.pmView.dom.removeEventListener("mousedown", this.viewMousedownHandler);
    this.pmView.dom.removeEventListener("mouseup", this.viewMouseupHandler);
    this.pmView.dom.removeEventListener("dragstart", this.dragHandler);
    this.pmView.dom.removeEventListener("dragover", this.dragHandler);

    this.pmView.dom.removeEventListener("focus", this.focusHandler);
    this.pmView.dom.removeEventListener("blur", this.blurHandler);

    document.removeEventListener("scroll", this.scrollHandler);
  }

  getSelectionBoundingBox() {
    const { state } = this.pmView;
    const { selection } = state;

    // support for CellSelections
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));

    if (isNodeSelection(selection)) {
      const node = this.pmView.nodeDOM(from) as HTMLElement;

      if (node) {
        return node.getBoundingClientRect();
      }
    }

    return posToDOMRect(this.pmView, from, to);
  }
}

export const formattingToolbarPluginKey = new PluginKey(
  "FormattingToolbarPlugin"
);

export class FormattingToolbarProsemirrorPlugin extends EventEmitter<any> {
  private view: FormattingToolbarView | undefined;
  public readonly plugin: Plugin;

  constructor(editor: BlockNoteEditor<any, any, any>) {
    super();
    this.plugin = new Plugin({
      key: formattingToolbarPluginKey,
      view: (editorView) => {
        this.view = new FormattingToolbarView(editor, editorView, (state) => {
          this.emit("update", state);
        });
        return this.view;
      },
    });
  }

  public onUpdate(callback: (state: FormattingToolbarState) => void) {
    return this.on("update", callback);
  }
}
