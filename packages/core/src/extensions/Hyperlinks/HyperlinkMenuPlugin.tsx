import { Editor, getMarkRange, posToDOMRect, Range } from "@tiptap/core";
import { Mark } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import {
  HyperlinkHoverMenu,
  HyperlinkHoverMenuFactory,
  HyperlinkHoverMenuParams,
} from "./HyperlinkMenuFactoryTypes";
const PLUGIN_KEY = new PluginKey("HyperlinkMenuPlugin");

export type HyperlinkMenuPluginProps = {
  hyperlinkMenuFactory: HyperlinkHoverMenuFactory;
};

export type HyperlinkHoverMenuViewProps = {
  editor: Editor;
  hyperlinkHoverMenuFactory: HyperlinkHoverMenuFactory;
};

class HyperlinkHoverMenuView {
  editor: Editor;

  hyperlinkHoverMenuParams: HyperlinkHoverMenuParams;
  hyperlinkHoverMenu: HyperlinkHoverMenu;

  menuUpdateTimer: NodeJS.Timeout | undefined;
  startMenuUpdateTimer: () => void;
  stopMenuUpdateTimer: () => void;

  mouseHoveredHyperlinkMark: Mark | undefined;
  mouseHoveredHyperlinkMarkRange: Range | undefined;

  keyboardHoveredHyperlinkMark: Mark | undefined;
  keyboardHoveredHyperlinkMarkRange: Range | undefined;

  hyperlinkMark: Mark | undefined;
  hyperlinkMarkRange: Range | undefined;

  constructor({
    editor,
    hyperlinkHoverMenuFactory,
  }: HyperlinkHoverMenuViewProps) {
    this.editor = editor;

    this.hyperlinkHoverMenuParams = this.initHyperlinkHoverMenuParams();
    this.hyperlinkHoverMenu = hyperlinkHoverMenuFactory(
      this.hyperlinkHoverMenuParams
    );

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
      this.updateHyperlinkHoverMenuParams();

      // Shows menu.
      if (!prevHyperlinkMark) {
        this.hyperlinkHoverMenu.show(this.hyperlinkHoverMenuParams);

        this.hyperlinkHoverMenu.element?.addEventListener(
          "mouseleave",
          this.startMenuUpdateTimer
        );
        this.hyperlinkHoverMenu.element?.addEventListener(
          "mouseenter",
          this.stopMenuUpdateTimer
        );

        return;
      }

      // Updates menu.
      this.hyperlinkHoverMenu.update(this.hyperlinkHoverMenuParams);
    }

    // Hides menu.
    if (prevHyperlinkMark && !this.hyperlinkMark) {
      this.hyperlinkHoverMenu.element?.removeEventListener(
        "mouseleave",
        this.startMenuUpdateTimer
      );
      this.hyperlinkHoverMenu.element?.removeEventListener(
        "mouseenter",
        this.stopMenuUpdateTimer
      );

      this.hyperlinkHoverMenu.hide();

      return;
    }
  }

  initHyperlinkHoverMenuParams() {
    return {
      hyperlinkUrl: "",
      hyperlinkText: "",
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
      },

      hyperlinkBoundingBox: new DOMRect(),
      editorElement: this.editor.options.element,
    };
  }

  updateHyperlinkHoverMenuParams() {
    if (this.hyperlinkMark) {
      this.hyperlinkHoverMenuParams.hyperlinkUrl =
        this.hyperlinkMark.attrs.href;
      this.hyperlinkHoverMenuParams.hyperlinkText =
        this.editor.view.state.doc.textBetween(
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to
        );
    }

    if (this.hyperlinkMarkRange) {
      this.hyperlinkHoverMenuParams.hyperlinkBoundingBox = posToDOMRect(
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
      new HyperlinkHoverMenuView({
        editor: editor,
        hyperlinkHoverMenuFactory: options.hyperlinkMenuFactory,
      }),
  });
};
