import { Editor, isTextSelection } from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { getBubbleMenuInitProps } from "../../menu-tools/BubbleMenu/getBubbleMenuInitProps";
import {
  BubbleMenu,
  BubbleMenuFactory,
} from "../../menu-tools/BubbleMenu/types";
import { getBubbleMenuUpdateProps } from "../../menu-tools/BubbleMenu/getBubbleMenuUpdateProps";

// Same as TipTap bubblemenu plugin, but with these changes:
// https://github.com/ueberdosis/tiptap/pull/2596/files
export interface BubbleMenuPluginProps {
  pluginKey: PluginKey;
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

  public bubbleMenu: BubbleMenu;

  public view: EditorView;

  public preventHide = false;

  public preventShow = false;

  public menuIsOpen = false;

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
    this.bubbleMenu = bubbleMenuFactory(getBubbleMenuInitProps(editor));
    this.view = view;

    if (shouldShow) {
      this.shouldShow = shouldShow;
    }

    this.view.dom.addEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.addEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.addEventListener("dragstart", this.dragstartHandler);

    this.editor.on("focus", this.focusHandler);
    this.editor.on("blur", this.blurHandler);
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
    this.bubbleMenu.element!.removeEventListener(
      "mousedown",
      this.mousedownHandler,
      {
        capture: true,
      }
    );

    this.bubbleMenu.hide();
    this.menuIsOpen = false;
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

    this.bubbleMenu.element!.removeEventListener(
      "mousedown",
      this.mousedownHandler,
      {
        capture: true,
      }
    );

    this.bubbleMenu.hide();
    this.menuIsOpen = false;
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

    // Checks if menu should be hidden.
    if (
      this.menuIsOpen &&
      !this.preventHide &&
      (!shouldShow || this.preventShow)
    ) {
      this.bubbleMenu.element!.removeEventListener(
        "mousedown",
        this.mousedownHandler,
        {
          capture: true,
        }
      );

      this.bubbleMenu.hide();
      this.menuIsOpen = false;

      return;
    }

    // Checks if menu should be updated.
    if (
      this.menuIsOpen &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      setTimeout(
        () => this.bubbleMenu.update(getBubbleMenuUpdateProps(this.editor)),
        350
      );

      return;
    }

    // Checks if menu should be shown.
    if (
      !this.menuIsOpen &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      this.bubbleMenu.show(getBubbleMenuUpdateProps(this.editor));
      this.menuIsOpen = true;

      this.bubbleMenu.element!.addEventListener(
        "mousedown",
        this.mousedownHandler,
        {
          capture: true,
        }
      );
    }
  }

  destroy() {
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
