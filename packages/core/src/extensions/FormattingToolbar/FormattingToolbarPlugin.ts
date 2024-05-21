import { isNodeSelection, isTextSelection, posToDOMRect } from "@tiptap/core";
import { EditorState, Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";

export type FormattingToolbarState = UiElementPosition;

export class FormattingToolbarView implements PluginView {
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
  }) => boolean = ({ state, from, to, view }) => {
    const { doc, selection } = state;
    const { empty } = selection;

    // Sometime check for `empty` is not enough.
    // Doubleclick an empty paragraph returns a node size of 2.
    // So we check also for an empty text size.
    const isEmptyTextBlock =
      !doc.textBetween(from, to).length && isTextSelection(state.selection);

    // check view.hasFocus so that the toolbar doesn't show up when the editor is not focused or when for example a code block is focused
    return !(!view.hasFocus() || empty || isEmptyTextBlock);
  };

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

    document.removeEventListener("scroll", this.scrollHandler);
  }

  closeMenu = () => {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

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
      props: {
        handleKeyDown: (_view, event: KeyboardEvent) => {
          if (event.key === "Escape" && this.shown) {
            this.view!.closeMenu();
            return true;
          }
          return false;
        },
      },
    });
  }

  public get shown() {
    return this.view?.state?.show || false;
  }

  public onUpdate(callback: (state: FormattingToolbarState) => void) {
    return this.on("update", callback);
  }

  public closeMenu = () => this.view!.closeMenu();
}
