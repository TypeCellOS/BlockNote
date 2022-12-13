import { Editor, isTextSelection } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

// Same as TipTap bubblemenu plugin, but with these changes:
// https://github.com/ueberdosis/tiptap/pull/2596/files
export interface BubbleMenuPluginProps {
  pluginKey: PluginKey | string;
  editor: Editor;
  bubbleMenuFactory: (editor: Editor) => HTMLElement;
  shouldShow?:
    | ((props: {
        editor: Editor;
        view: EditorView;
        state: EditorState;
        oldState?: EditorState;
        from: number;
        to: number;
      }) => boolean)
    | null;
}

export type BubbleMenuViewProps = BubbleMenuPluginProps & {
  view: EditorView;
};

export class BubbleMenuView {
  public editor: Editor;

  public bubbleMenuFactory: (editor: Editor) => HTMLElement;

  public bubbleMenuElement: HTMLElement | undefined;

  public view: EditorView;

  public preventHide = false;

  public preventShow = false;

  public shouldShow: Exclude<BubbleMenuPluginProps["shouldShow"], null> = ({
    view,
    state,
    from,
    to,
  }) => {
    const { doc, selection } = state;
    const { empty } = selection;

    // Sometime check for `empty` is not enough.
    // Doubleclick an empty paragraph returns a node size of 2.
    // So we check also for an empty text size.
    const isEmptyTextBlock =
      !doc.textBetween(from, to).length && isTextSelection(state.selection);

    if (!view.hasFocus() || empty || isEmptyTextBlock) {
      return false;
    }

    return true;
  };

  constructor({
    editor,
    bubbleMenuFactory,
    view,
    shouldShow,
  }: BubbleMenuViewProps) {
    this.editor = editor;
    this.bubbleMenuFactory = bubbleMenuFactory;
    this.view = view;

    if (shouldShow) {
      this.shouldShow = shouldShow;
    }

    this.addEditorListeners();
  }

  mousedownHandler = () => {
    this.preventHide = true;
  };

  viewMousedownHandler = () => {
    this.preventShow = true;
  };

  viewMouseupHandler = () => {
    this.preventShow = false;
    setTimeout(() => this.update(this.editor.view));
  };

  dragstartHandler = () => {
    this.destroy();
  };

  focusHandler = () => {
    // we use `setTimeout` to make sure `selection` is already updated
    setTimeout(() => this.update(this.editor.view));
  };

  blurHandler = ({ event }: { event: FocusEvent }) => {
    if (this.preventHide) {
      this.preventHide = false;

      return;
    }

    if (
      event?.relatedTarget &&
      this.bubbleMenuElement?.parentNode?.contains(event.relatedTarget as Node)
    ) {
      return;
    }

    this.destroy();
  };

  update(view: EditorView, oldState?: EditorState) {
    console.log("UPDATING");
    const { state, composing } = view;
    const { doc, selection } = state;
    const isSame =
      oldState && oldState.doc.eq(doc) && oldState.selection.eq(selection);

    if (composing || isSame) {
      console.log("NOT COMPOSING OR SAME");
      return;
    }

    // support for CellSelections
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));

    const shouldShow = this.shouldShow?.({
      editor: this.editor,
      view,
      state,
      oldState,
      from,
      to,
    });

    if (!shouldShow || this.preventShow) {
      console.log("SHOULDN'T SHOW OR PREVENT SHOW");
      !shouldShow && console.log("SHOULDN'T SHOW");
      this.preventShow && console.log("PREVENT SHOW");

      this.destroy();

      return;
    }

    console.log("SHOW");
    this.create();
  }

  create() {
    if (!this.bubbleMenuElement) {
      this.bubbleMenuElement = this.bubbleMenuFactory(this.editor);
      this.bubbleMenuElement.style.visibility = "visible";
      this.bubbleMenuElement.addEventListener(
        "mousedown",
        this.mousedownHandler,
        {
          capture: true,
        }
      );
    }
  }

  destroy() {
    if (this.bubbleMenuElement) {
      this.bubbleMenuElement.removeEventListener(
        "mousedown",
        this.mousedownHandler,
        {
          capture: true,
        }
      );
      this.bubbleMenuElement.remove();
      this.bubbleMenuElement = undefined;
    }
  }

  addEditorListeners() {
    this.view.dom.addEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.addEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.addEventListener("dragstart", this.dragstartHandler);

    this.editor.on("focus", this.focusHandler);
    this.editor.on("blur", this.blurHandler);
  }

  removeEditorListeners() {
    this.destroy();

    this.view.dom.removeEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.removeEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.removeEventListener("dragstart", this.dragstartHandler);

    this.editor.off("focus", this.focusHandler);
    this.editor.off("blur", this.blurHandler);
  }
}

export const createBubbleMenuPlugin = (options: BubbleMenuPluginProps) => {
  return new Plugin({
    key: new PluginKey("BubbleMenuPlugin"),
    view: (view) => new BubbleMenuView({ view, ...options }),
  });
};
