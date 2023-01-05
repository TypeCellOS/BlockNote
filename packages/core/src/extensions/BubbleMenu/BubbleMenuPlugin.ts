import {
  Editor,
  isNodeSelection,
  isTextSelection,
  posToDOMRect,
} from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import {
  BubbleMenu,
  BubbleMenuFactory,
  BubbleMenuParams,
} from "../../menu-tools/BubbleMenu/types";

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

  public view: EditorView;

  public bubbleMenuParams: BubbleMenuParams;

  public bubbleMenu: BubbleMenu;

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

    return !(!view.hasFocus() || empty || isEmptyTextBlock);
  };

  constructor({
    editor,
    bubbleMenuFactory,
    view,
    shouldShow,
  }: BubbleMenuViewProps) {
    this.editor = editor;
    this.view = view;

    this.bubbleMenuParams = this.initBubbleMenuParams();
    this.bubbleMenu = bubbleMenuFactory(this.bubbleMenuParams);

    if (shouldShow) {
      this.shouldShow = shouldShow;
    }

    this.view.dom.addEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.addEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.addEventListener("dragstart", this.dragstartHandler);

    this.editor.on("focus", this.focusHandler);
    this.editor.on("blur", this.blurHandler);
  }

  viewMousedownHandler = () => {
    this.preventShow = true;
  };

  viewMouseupHandler = () => {
    this.preventShow = false;
    setTimeout(() => this.update(this.editor.view));
  };

  dragstartHandler = () => {
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

    // Checks if menu should be shown.
    if (
      !this.menuIsOpen &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      this.updateBubbleMenuParams();
      this.bubbleMenu.show(this.bubbleMenuParams);
      this.menuIsOpen = true;

      // TODO: Is this necessary? Also for other menu plugins.
      // Listener stops focus moving to the menu on click.
      this.bubbleMenu.element!.addEventListener("mousedown", (event) =>
        event.preventDefault()
      );

      return;
    }

    // Checks if menu should be updated.
    if (
      this.menuIsOpen &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      // Hacky fix to account for animations. Since the bounding boxes/DOMRects of elements are calculated based on how
      // they are displayed on the screen, we need to wait until a given animation is completed to get the correct
      // values for the selectionBoundingBox param.
      // TODO: Find a better solution. The delay can cause menu updates to occur while the menu is hidden, which may
      //  cause issues depending on the menu factory implementation.
      setTimeout(() => {
        this.updateBubbleMenuParams();
        this.bubbleMenu.update(this.bubbleMenuParams);
      }, 400);

      return;
    }

    // Checks if menu should be hidden.
    if (
      this.menuIsOpen &&
      !this.preventHide &&
      (!shouldShow || this.preventShow)
    ) {
      this.bubbleMenu.hide();
      this.menuIsOpen = false;

      // Listener stops focus moving to the menu on click.
      this.bubbleMenu.element!.removeEventListener("mousedown", (event) =>
        event.preventDefault()
      );

      return;
    }
  }

  destroy() {
    this.view.dom.removeEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.removeEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.removeEventListener("dragstart", this.dragstartHandler);

    this.editor.off("focus", this.focusHandler);
    this.editor.off("blur", this.blurHandler);
  }

  getSelectionBoundingBox() {
    const { state } = this.editor.view;
    const { selection } = state;

    // support for CellSelections
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));

    if (isNodeSelection(selection)) {
      const node = this.editor.view.nodeDOM(from) as HTMLElement;

      if (node) {
        return node.getBoundingClientRect();
      }
    }

    return posToDOMRect(this.editor.view, from, to);
  }

  initBubbleMenuParams() {
    return {
      boldIsActive: this.editor.isActive("bold"),
      toggleBold: () => {
        this.editor.view.focus();
        this.editor.commands.toggleBold();
      },
      italicIsActive: this.editor.isActive("italic"),
      toggleItalic: () => {
        this.editor.view.focus();
        this.editor.commands.toggleItalic();
      },
      underlineIsActive: this.editor.isActive("underline"),
      toggleUnderline: () => {
        this.editor.view.focus();
        this.editor.commands.toggleUnderline();
      },
      strikeIsActive: this.editor.isActive("strike"),
      toggleStrike: () => {
        this.editor.view.focus();
        this.editor.commands.toggleStrike();
      },
      hyperlinkIsActive: this.editor.isActive("link"),
      activeHyperlinkUrl: this.editor.getAttributes("link").href,
      activeHyperlinkText: this.editor.state.doc.textBetween(
        this.editor.state.selection.from,
        this.editor.state.selection.to
      ),
      setHyperlink: (url: string, text?: string) => {
        if (url === "") {
          return;
        }

        let { from, to } = this.editor.state.selection;

        if (!text) {
          text = this.editor.state.doc.textBetween(from, to);
        }

        const mark = this.editor.schema.mark("link", { href: url });

        this.editor.view.dispatch(
          this.editor.view.state.tr
            .insertText(text, from, to)
            .addMark(from, from + text.length, mark)
        );
      },
      paragraphIsActive:
        this.editor.state.selection.$from.node().type.name === "textContent",
      setParagraph: () => {
        this.editor.view.focus();
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.from,
          "textContent"
        );
      },
      headingIsActive:
        this.editor.state.selection.$from.node().type.name === "headingContent",
      activeHeadingLevel:
        this.editor.state.selection.$from.node().attrs["headingLevel"],
      setHeading: (level: string = "1") => {
        this.editor.view.focus();
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.from,
          "headingContent",
          {
            headingLevel: level,
          }
        );
      },
      listItemIsActive:
        this.editor.state.selection.$from.node().type.name ===
        "listItemContent",
      activeListItemType:
        this.editor.state.selection.$from.node().attrs["listItemType"],
      setListItem: (type: string = "unordered") => {
        this.editor.view.focus();
        this.editor.commands.BNSetContentType(
          this.editor.state.selection.from,
          "listItemContent",
          {
            listItemType: type,
          }
        );
      },
      selectionBoundingBox: this.getSelectionBoundingBox(),
      editorElement: this.editor.options.element,
    };
  }

  updateBubbleMenuParams() {
    this.bubbleMenuParams.boldIsActive = this.editor.isActive("bold");
    this.bubbleMenuParams.italicIsActive = this.editor.isActive("italic");
    this.bubbleMenuParams.underlineIsActive = this.editor.isActive("underline");
    this.bubbleMenuParams.strikeIsActive = this.editor.isActive("strike");
    this.bubbleMenuParams.hyperlinkIsActive = this.editor.isActive("link");
    this.bubbleMenuParams.activeHyperlinkUrl =
      this.editor.getAttributes("link").href;
    this.bubbleMenuParams.activeHyperlinkText =
      this.editor.state.doc.textBetween(
        this.editor.state.selection.from,
        this.editor.state.selection.to
      );

    this.bubbleMenuParams.paragraphIsActive =
      this.editor.state.selection.$from.node().type.name === "textContent";
    this.bubbleMenuParams.headingIsActive =
      this.editor.state.selection.$from.node().type.name === "headingContent";
    this.bubbleMenuParams.activeHeadingLevel =
      this.editor.state.selection.$from.node().attrs["headingLevel"];
    this.bubbleMenuParams.listItemIsActive =
      this.editor.state.selection.$from.node().type.name === "listItemContent";
    this.bubbleMenuParams.activeListItemType =
      this.editor.state.selection.$from.node().attrs["listItemType"];

    this.bubbleMenuParams.selectionBoundingBox = this.getSelectionBoundingBox();
  }
}

export const createBubbleMenuPlugin = (options: BubbleMenuPluginProps) => {
  return new Plugin({
    key: new PluginKey("BubbleMenuPlugin"),
    view: (view) => new BubbleMenuView({ view, ...options }),
  });
};
