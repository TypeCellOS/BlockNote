import { Editor, getMarkRange, posToDOMRect, Range } from "@tiptap/core";
import { Mark } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import {
  HyperlinkMenu,
  HyperlinkMenuFactory,
  HyperlinkMenuParams,
} from "./HyperlinkMenuFactoryTypes";
const PLUGIN_KEY = new PluginKey("HyperlinkMenuPlugin");

export type HyperlinkMenuPluginProps = {
  hyperlinkMenuFactory: HyperlinkMenuFactory;
};

export type HyperlinkMenuViewProps = {
  editor: Editor;
  hyperlinkMenuFactory: HyperlinkMenuFactory;
};

class HyperlinkMenuView {
  editor: Editor;

  hyperlinkMenuParams: HyperlinkMenuParams;
  hyperlinkMenu: HyperlinkMenu;

  menuUpdateTimer: NodeJS.Timeout | undefined;
  startMenuUpdateTimer: () => void;
  stopMenuUpdateTimer: () => void;

  mouseHoveredHyperlinkMark: Mark | undefined;
  mouseHoveredHyperlinkMarkRange: Range | undefined;

  keyboardHoveredHyperlinkMark: Mark | undefined;
  keyboardHoveredHyperlinkMarkRange: Range | undefined;

  hyperlinkMark: Mark | undefined;
  hyperlinkMarkRange: Range | undefined;

  constructor({ editor, hyperlinkMenuFactory }: HyperlinkMenuViewProps) {
    this.editor = editor;

    this.hyperlinkMenuParams = this.initHyperlinkMenuParams();
    this.hyperlinkMenu = hyperlinkMenuFactory(this.hyperlinkMenuParams);

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

    editor.view.dom.addEventListener("mouseover", (event) => {
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
          editor.view.posAtDOM(hoveredHyperlinkElement, 0) + 1;
        const resolvedPosInHoveredHyperlinkMark = editor.state.doc.resolve(
          posInHoveredHyperlinkMark
        );
        const marksAtPos = resolvedPosInHoveredHyperlinkMark.marks();

        for (const mark of marksAtPos) {
          if (mark.type.name === editor.schema.mark("link").type.name) {
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
    });
  }

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

    if (this.hyperlinkMark) {
      this.updateHyperlinkMenuParams();

      // Shows menu.
      if (!prevHyperlinkMark) {
        this.hyperlinkMenu.show(this.hyperlinkMenuParams);

        this.hyperlinkMenu.element?.addEventListener(
          "mouseleave",
          this.startMenuUpdateTimer
        );
        this.hyperlinkMenu.element?.addEventListener(
          "mouseenter",
          this.stopMenuUpdateTimer
        );

        return;
      }

      // Updates menu.
      this.hyperlinkMenu.update(this.hyperlinkMenuParams);
    }

    // Hides menu.
    if (prevHyperlinkMark && !this.hyperlinkMark) {
      this.hyperlinkMenu.element?.removeEventListener(
        "mouseleave",
        this.startMenuUpdateTimer
      );
      this.hyperlinkMenu.element?.removeEventListener(
        "mouseenter",
        this.stopMenuUpdateTimer
      );

      this.hyperlinkMenu.hide();

      return;
    }
  }

  initHyperlinkMenuParams(): HyperlinkMenuParams {
    return {
      url: "",
      text: "",
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

        this.hyperlinkMenu.hide();
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

        this.hyperlinkMenu.hide();
      },

      boundingBox: new DOMRect(),
      editorElement: this.editor.options.element,
    };
  }

  updateHyperlinkMenuParams() {
    if (this.hyperlinkMark) {
      this.hyperlinkMenuParams.url = this.hyperlinkMark.attrs.href;
      this.hyperlinkMenuParams.text = this.editor.view.state.doc.textBetween(
        this.hyperlinkMarkRange!.from,
        this.hyperlinkMarkRange!.to
      );
    }

    if (this.hyperlinkMarkRange) {
      this.hyperlinkMenuParams.boundingBox = posToDOMRect(
        this.editor.view,
        this.hyperlinkMarkRange!.from,
        this.hyperlinkMarkRange!.to
      );
    }
  }
}

export const createHyperlinkMenuPlugin = (
  editor: Editor,
  options: HyperlinkMenuPluginProps
) => {
  return new Plugin({
    key: PLUGIN_KEY,
    view: () =>
      new HyperlinkMenuView({
        editor: editor,
        hyperlinkMenuFactory: options.hyperlinkMenuFactory,
      }),
  });
};
