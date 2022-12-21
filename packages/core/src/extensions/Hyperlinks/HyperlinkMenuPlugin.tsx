import { Editor, getMarkRange, posToDOMRect, Range } from "@tiptap/core";
import { Mark } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import {
  HyperlinkHoverMenu,
  HyperlinkHoverMenuFactory,
} from "../../menu-tools/HyperlinkHoverMenu/types";
import { getHyperlinkHoverMenuInitProps } from "../../menu-tools/HyperlinkHoverMenu/getHyperlinkHoverMenuInitProps";
import { getHyperlinkHoverMenuUpdateProps } from "../../menu-tools/HyperlinkHoverMenu/getHyperlinkMenuUpdateProps";
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

    const editHyperlink = (url: string, text: string) => {
      const tr = editor.view.state.tr.insertText(
        text,
        this.hyperlinkMarkRange!.from,
        this.hyperlinkMarkRange!.to
      );
      tr.addMark(
        this.hyperlinkMarkRange!.from,
        this.hyperlinkMarkRange!.from + text.length,
        editor.schema.mark("link", { href: url })
      );
      editor.view.dispatch(tr);
    };

    const deleteHyperlink = () => {
      editor.view.dispatch(
        editor.view.state.tr
          .removeMark(
            this.hyperlinkMarkRange!.from,
            this.hyperlinkMarkRange!.to,
            this.hyperlinkMark!.type
          )
          .setMeta("preventAutolink", true)
      );
    };

    this.hyperlinkHoverMenu = hyperlinkHoverMenuFactory(
      getHyperlinkHoverMenuInitProps(
        editHyperlink,
        deleteHyperlink,
        editor.options.element
      )
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

    if (this.hyperlinkMark) {
      // Gets all variables/functions needed to render menu.
      const hyperlinkUrl = this.hyperlinkMark.attrs.href;
      const hyperlinkText = this.editor.view.state.doc.textBetween(
        this.hyperlinkMarkRange!.from,
        this.hyperlinkMarkRange!.to
      );
      const hyperlinkBoundingBox = posToDOMRect(
        this.editor.view,
        this.hyperlinkMarkRange!.from,
        this.hyperlinkMarkRange!.to
      );

      // Shows menu.
      if (!prevHyperlinkMark) {
        this.hyperlinkHoverMenu.show(
          getHyperlinkHoverMenuUpdateProps(
            hyperlinkUrl,
            hyperlinkText,
            hyperlinkBoundingBox
          )
        );

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
      this.hyperlinkHoverMenu.update(
        getHyperlinkHoverMenuUpdateProps(
          hyperlinkUrl,
          hyperlinkText,
          hyperlinkBoundingBox
        )
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
