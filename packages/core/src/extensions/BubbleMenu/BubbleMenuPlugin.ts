import { Editor, isTextSelection } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { BubbleMenuFactory } from "../../menu-tools/BubbleMenu/types";
import { Menu } from "../../menu-tools/types";
import { getBubbleMenuFactoryFunctions } from "../../menu-tools/BubbleMenu/getBubbleMenuFactoryFunctions";

// Same as TipTap bubblemenu plugin, but with these changes:
// https://github.com/ueberdosis/tiptap/pull/2596/files
export interface BubbleMenuPluginProps {
  pluginKey: PluginKey | string;
  editor: Editor;
  bubbleMenuFactory: BubbleMenuFactory;
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

  public bubbleMenuFactory: BubbleMenuFactory;

  public bubbleMenu: Menu;

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
    this.bubbleMenu = this.bubbleMenuFactory(
      getBubbleMenuFactoryFunctions(editor)
    );
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
    this.hideMenu();
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
      this.bubbleMenu.element?.parentNode?.contains(event.relatedTarget as Node)
    ) {
      return;
    }

    this.hideMenu();
  };

  update(view: EditorView, oldState?: EditorState) {
    const { state, composing } = view;
    const { doc, selection } = state;
    const isSame =
      oldState && oldState.doc.eq(doc) && oldState.selection.eq(selection);

    if (composing || isSame) {
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
      this.hideMenu();
      return;
    }

    this.showMenu();
    this.bubbleMenu.update();
  }

  showMenu() {
    this.bubbleMenu.show();

    this.bubbleMenu.element!.style.visibility = "visible";
    this.bubbleMenu.element!.addEventListener(
      "mousedown",
      this.mousedownHandler,
      {
        capture: true,
      }
    );
  }

  hideMenu() {
    this.bubbleMenu.hide();

    this.bubbleMenu.element!.removeEventListener(
      "mousedown",
      this.mousedownHandler,
      {
        capture: true,
      }
    );
  }

  addEditorListeners() {
    this.view.dom.addEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.addEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.addEventListener("dragstart", this.dragstartHandler);

    this.editor.on("focus", this.focusHandler);
    this.editor.on("blur", this.blurHandler);
  }

  removeEditorListeners() {
    this.hideMenu();

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
