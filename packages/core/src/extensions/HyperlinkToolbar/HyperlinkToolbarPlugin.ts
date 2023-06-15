import { Editor, getMarkRange, posToDOMRect, Range } from "@tiptap/core";
import { Mark } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import {
  HyperlinkToolbar,
  HyperlinkToolbarDynamicParams,
  HyperlinkToolbarFactory,
  HyperlinkToolbarStaticParams,
} from "./HyperlinkToolbarFactoryTypes";
const PLUGIN_KEY = new PluginKey("HyperlinkToolbarPlugin");

export type HyperlinkToolbarPluginProps = {
  hyperlinkToolbarFactory: HyperlinkToolbarFactory;
};

export type HyperlinkToolbarViewProps = {
  editor: Editor;
  hyperlinkToolbarFactory: HyperlinkToolbarFactory;
};

class HyperlinkToolbarView {
  editor: Editor;

  hyperlinkToolbar: HyperlinkToolbar;

  menuUpdateTimer: NodeJS.Timeout | undefined;
  startMenuUpdateTimer: () => void;
  stopMenuUpdateTimer: () => void;

  mouseHoveredHyperlinkMark: Mark | undefined;
  mouseHoveredHyperlinkMarkRange: Range | undefined;

  keyboardHoveredHyperlinkMark: Mark | undefined;
  keyboardHoveredHyperlinkMarkRange: Range | undefined;

  hyperlinkMark: Mark | undefined;
  hyperlinkMarkRange: Range | undefined;

  constructor({ editor, hyperlinkToolbarFactory }: HyperlinkToolbarViewProps) {
    this.editor = editor;

    this.hyperlinkToolbar = hyperlinkToolbarFactory(this.getStaticParams());

    this.startMenuUpdateTimer = () => {
      this.menuUpdateTimer = setTimeout(() => {
        this.update();
      }, 250);
    };

    this.stopMenuUpdateTimer = () => {
      if (this.menuUpdateTimer) {
        clearTimeout(this.menuUpdateTimer);
        this.menuUpdateTimer = undefined;
      }

      return false;
    };

    this.editor.view.dom.addEventListener("mouseover", this.mouseOverHandler);
    document.addEventListener("click", this.clickHandler, true);
    document.addEventListener("scroll", this.scrollHandler);
  }

  mouseOverHandler = (event: MouseEvent) => {
    // Resets the hyperlink mark currently hovered by the mouse cursor.
    this.mouseHoveredHyperlinkMark = undefined;
    this.mouseHoveredHyperlinkMarkRange = undefined;

    this.stopMenuUpdateTimer();

    if (
      event.target instanceof HTMLAnchorElement &&
      event.target.nodeName === "A"
    ) {
      // Finds link mark at the hovered element's position to update mouseHoveredHyperlinkMark and
      // mouseHoveredHyperlinkMarkRange.
      const hoveredHyperlinkElement = event.target;
      const posInHoveredHyperlinkMark =
        this.editor.view.posAtDOM(hoveredHyperlinkElement, 0) + 1;
      const resolvedPosInHoveredHyperlinkMark = this.editor.state.doc.resolve(
        posInHoveredHyperlinkMark
      );
      const marksAtPos = resolvedPosInHoveredHyperlinkMark.marks();

      for (const mark of marksAtPos) {
        if (mark.type.name === this.editor.schema.mark("link").type.name) {
          this.mouseHoveredHyperlinkMark = mark;
          this.mouseHoveredHyperlinkMarkRange =
            getMarkRange(
              resolvedPosInHoveredHyperlinkMark,
              mark.type,
              mark.attrs
            ) || undefined;

          break;
        }
      }
    }

    this.startMenuUpdateTimer();

    return false;
  };

  clickHandler = (event: MouseEvent) => {
    if (
      // Toolbar is open.
      this.hyperlinkMark &&
      // An element is clicked.
      event &&
      event.target &&
      // Element is outside the editor.
      this.editor.view.dom !== (event.target as Node) &&
      !this.editor.view.dom.contains(event.target as Node) &&
      // Element is outside the toolbar.
      this.hyperlinkToolbar.element !== (event.target as Node) &&
      !this.hyperlinkToolbar.element?.contains(event.target as Node)
    ) {
      this.hyperlinkToolbar.hide();
    }
  };

  scrollHandler = () => {
    if (this.hyperlinkMark !== undefined) {
      this.hyperlinkToolbar.render(this.getDynamicParams(), false);
    }
  };

  update() {
    if (!this.editor.view.hasFocus()) {
      return;
    }

    // Saves the currently hovered hyperlink mark before it's updated.
    const prevHyperlinkMark = this.hyperlinkMark;

    // Resets the currently hovered hyperlink mark.
    this.hyperlinkMark = undefined;
    this.hyperlinkMarkRange = undefined;

    // Resets the hyperlink mark currently hovered by the keyboard cursor.
    this.keyboardHoveredHyperlinkMark = undefined;
    this.keyboardHoveredHyperlinkMarkRange = undefined;

    // Finds link mark at the editor selection's position to update keyboardHoveredHyperlinkMark and
    // keyboardHoveredHyperlinkMarkRange.
    if (this.editor.state.selection.empty) {
      const marksAtPos = this.editor.state.selection.$from.marks();

      for (const mark of marksAtPos) {
        if (mark.type.name === this.editor.schema.mark("link").type.name) {
          this.keyboardHoveredHyperlinkMark = mark;
          this.keyboardHoveredHyperlinkMarkRange =
            getMarkRange(
              this.editor.state.selection.$from,
              mark.type,
              mark.attrs
            ) || undefined;

          break;
        }
      }
    }

    if (this.mouseHoveredHyperlinkMark) {
      this.hyperlinkMark = this.mouseHoveredHyperlinkMark;
      this.hyperlinkMarkRange = this.mouseHoveredHyperlinkMarkRange;
    }

    // Keyboard cursor position takes precedence over mouse hovered hyperlink.
    if (this.keyboardHoveredHyperlinkMark) {
      this.hyperlinkMark = this.keyboardHoveredHyperlinkMark;
      this.hyperlinkMarkRange = this.keyboardHoveredHyperlinkMarkRange;
    }

    if (this.hyperlinkMark && this.editor.isEditable) {
      this.getDynamicParams();

      // Shows menu.
      if (!prevHyperlinkMark) {
        this.hyperlinkToolbar.render(this.getDynamicParams(), true);

        this.hyperlinkToolbar.element?.addEventListener(
          "mouseleave",
          this.startMenuUpdateTimer
        );
        this.hyperlinkToolbar.element?.addEventListener(
          "mouseenter",
          this.stopMenuUpdateTimer
        );

        return;
      }

      // Updates menu.
      this.hyperlinkToolbar.render(this.getDynamicParams(), false);

      return;
    }

    // Hides menu.
    if (prevHyperlinkMark && (!this.hyperlinkMark || !this.editor.isEditable)) {
      this.hyperlinkToolbar.element?.removeEventListener(
        "mouseleave",
        this.startMenuUpdateTimer
      );
      this.hyperlinkToolbar.element?.removeEventListener(
        "mouseenter",
        this.stopMenuUpdateTimer
      );

      this.hyperlinkToolbar.hide();

      return;
    }
  }

  destroy() {
    this.editor.view.dom.removeEventListener(
      "mouseover",
      this.mouseOverHandler
    );
    document.removeEventListener("scroll", this.scrollHandler);
  }

  getStaticParams(): HyperlinkToolbarStaticParams {
    return {
      editHyperlink: (url: string, text: string) => {
        const tr = this.editor.view.state.tr.insertText(
          text,
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to
        );
        tr.addMark(
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.from + text.length,
          this.editor.schema.mark("link", { href: url })
        );
        this.editor.view.dispatch(tr);
        this.editor.view.focus();

        this.hyperlinkToolbar.hide();
      },
      deleteHyperlink: () => {
        this.editor.view.dispatch(
          this.editor.view.state.tr
            .removeMark(
              this.hyperlinkMarkRange!.from,
              this.hyperlinkMarkRange!.to,
              this.hyperlinkMark!.type
            )
            .setMeta("preventAutolink", true)
        );
        this.editor.view.focus();

        this.hyperlinkToolbar.hide();
      },
    };
  }

  getDynamicParams(): HyperlinkToolbarDynamicParams {
    return {
      url: this.hyperlinkMark!.attrs.href,
      text: this.editor.view.state.doc.textBetween(
        this.hyperlinkMarkRange!.from,
        this.hyperlinkMarkRange!.to
      ),
      referenceRect: posToDOMRect(
        this.editor.view,
        this.hyperlinkMarkRange!.from,
        this.hyperlinkMarkRange!.to
      ),
    };
  }
}

export const createHyperlinkToolbarPlugin = (
  editor: Editor,
  options: HyperlinkToolbarPluginProps
) => {
  return new Plugin({
    key: PLUGIN_KEY,
    view: () =>
      new HyperlinkToolbarView({
        editor: editor,
        hyperlinkToolbarFactory: options.hyperlinkToolbarFactory,
      }),
  });
};
