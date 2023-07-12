import { getMarkRange, posToDOMRect, Range } from "@tiptap/core";
import { Mark } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import {
  BaseUiElementCallbacks,
  BaseUiElementState,
} from "../../shared/BaseUiElementTypes";
import { BlockSchema } from "../Blocks/api/blockTypes";

export type HyperlinkToolbarCallbacks = BaseUiElementCallbacks & {
  // Updates or deletes the hovered hyperlink.
  editHyperlink: (url: string, text: string) => void;
  deleteHyperlink: () => void;

  // When hovering on/off hyperlinks using the mouse cursor, the hyperlink
  // toolbar will open & close with a delay. These functions start & stop the
  // delay timer, and should be used for when the mouse cursor enters & exits
  // the hyperlink toolbar.
  startHideTimer: () => void;
  stopHideTimer: () => void;
};

export type HyperlinkToolbarState = BaseUiElementState & {
  // The hovered hyperlink's URL, and the text it's displayed with in the
  // editor.
  url: string;
  text: string;
};

class HyperlinkToolbarView<BSchema extends BlockSchema> {
  editor: BlockNoteEditor<BSchema>;

  private hyperlinkToolbarState?: HyperlinkToolbarState;
  public updateHyperlinkToolbar: () => void;

  menuUpdateTimer: NodeJS.Timeout | undefined;
  startMenuUpdateTimer: () => void;
  stopMenuUpdateTimer: () => void;

  mouseHoveredHyperlinkMark: Mark | undefined;
  mouseHoveredHyperlinkMarkRange: Range | undefined;

  keyboardHoveredHyperlinkMark: Mark | undefined;
  keyboardHoveredHyperlinkMarkRange: Range | undefined;

  hyperlinkMark: Mark | undefined;
  hyperlinkMarkRange: Range | undefined;

  constructor(
    editor: BlockNoteEditor<BSchema>,
    updateHyperlinkToolbar: (
      hyperlinkToolbarState: HyperlinkToolbarState
    ) => void
  ) {
    this.editor = editor;

    this.updateHyperlinkToolbar = () => {
      if (!this.hyperlinkToolbarState) {
        throw new Error("Attempting to update uninitialized hyperlink toolbar");
      }

      updateHyperlinkToolbar(this.hyperlinkToolbarState);
    };

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

    this.editor._tiptapEditor.view.dom.addEventListener(
      "mouseover",
      this.mouseOverHandler
    );
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
        this.editor._tiptapEditor.view.posAtDOM(hoveredHyperlinkElement, 0) + 1;
      const resolvedPosInHoveredHyperlinkMark =
        this.editor._tiptapEditor.state.doc.resolve(posInHoveredHyperlinkMark);
      const marksAtPos = resolvedPosInHoveredHyperlinkMark.marks();

      for (const mark of marksAtPos) {
        if (
          mark.type.name ===
          this.editor._tiptapEditor.schema.mark("link").type.name
        ) {
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
    const editorWrapper = this.editor._tiptapEditor.view.dom.parentElement!;

    if (
      // Toolbar is open.
      this.hyperlinkMark &&
      // An element is clicked.
      event &&
      event.target &&
      // The clicked element is not the editor.
      !(
        editorWrapper === (event.target as Node) ||
        editorWrapper.contains(event.target as Node)
      )
    ) {
      if (this.hyperlinkToolbarState?.show) {
        this.hyperlinkToolbarState.show = false;
        this.updateHyperlinkToolbar();
      }
    }
  };

  scrollHandler = () => {
    if (this.hyperlinkMark !== undefined) {
      if (this.hyperlinkToolbarState?.show) {
        this.hyperlinkToolbarState.referencePos = posToDOMRect(
          this.editor._tiptapEditor.view,
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to
        );
        this.updateHyperlinkToolbar();
      }
    }
  };

  editHyperlink(url: string, text: string) {
    const tr = this.editor._tiptapEditor.view.state.tr.insertText(
      text,
      this.hyperlinkMarkRange!.from,
      this.hyperlinkMarkRange!.to
    );
    tr.addMark(
      this.hyperlinkMarkRange!.from,
      this.hyperlinkMarkRange!.from + text.length,
      this.editor._tiptapEditor.schema.mark("link", { href: url })
    );
    this.editor._tiptapEditor.view.dispatch(tr);
    this.editor._tiptapEditor.view.focus();

    if (this.hyperlinkToolbarState?.show) {
      this.hyperlinkToolbarState.show = false;
      this.updateHyperlinkToolbar();
    }
  }

  deleteHyperlink() {
    this.editor._tiptapEditor.view.dispatch(
      this.editor._tiptapEditor.view.state.tr
        .removeMark(
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to,
          this.hyperlinkMark!.type
        )
        .setMeta("preventAutolink", true)
    );
    this.editor._tiptapEditor.view.focus();

    if (this.hyperlinkToolbarState?.show) {
      this.hyperlinkToolbarState.show = false;
      this.updateHyperlinkToolbar();
    }
  }

  update() {
    if (!this.editor._tiptapEditor.view.hasFocus()) {
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
    if (this.editor._tiptapEditor.state.selection.empty) {
      const marksAtPos =
        this.editor._tiptapEditor.state.selection.$from.marks();

      for (const mark of marksAtPos) {
        if (
          mark.type.name ===
          this.editor._tiptapEditor.schema.mark("link").type.name
        ) {
          this.keyboardHoveredHyperlinkMark = mark;
          this.keyboardHoveredHyperlinkMarkRange =
            getMarkRange(
              this.editor._tiptapEditor.state.selection.$from,
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
      this.hyperlinkToolbarState = {
        show: true,
        referencePos: posToDOMRect(
          this.editor._tiptapEditor.view,
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to
        ),
        url: this.hyperlinkMark!.attrs.href,
        text: this.editor._tiptapEditor.view.state.doc.textBetween(
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to
        ),
      };
      this.updateHyperlinkToolbar();

      return;
    }

    // Hides menu.
    if (
      this.hyperlinkToolbarState?.show &&
      prevHyperlinkMark &&
      (!this.hyperlinkMark || !this.editor.isEditable)
    ) {
      this.hyperlinkToolbarState.show = false;
      this.updateHyperlinkToolbar();

      return;
    }
  }

  destroy() {
    this.editor._tiptapEditor.view.dom.removeEventListener(
      "mouseover",
      this.mouseOverHandler
    );
    document.removeEventListener("scroll", this.scrollHandler);
    document.removeEventListener("click", this.clickHandler, true);
  }
}

export const hyperlinkToolbarPluginKey = new PluginKey(
  "HyperlinkToolbarPlugin"
);
export const createHyperlinkToolbar = <BSchema extends BlockSchema>(
  editor: BlockNoteEditor<BSchema>,
  updateHyperlinkToolbar: (hyperlinkToolbarState: HyperlinkToolbarState) => void
): HyperlinkToolbarCallbacks => {
  let hyperlinkToolbarView: HyperlinkToolbarView<BSchema>;

  editor._tiptapEditor.registerPlugin(
    new Plugin({
      key: hyperlinkToolbarPluginKey,
      view: () => {
        hyperlinkToolbarView = new HyperlinkToolbarView(
          editor,
          updateHyperlinkToolbar
        );
        return hyperlinkToolbarView;
      },
    }),
    // Ensures the plugin is loaded at the highest priority so that things like
    // keyboard handlers work.
    (hyperlinkToolbarPlugin, plugins) => {
      plugins.unshift(hyperlinkToolbarPlugin);
      return plugins;
    }
  );
  return {
    editHyperlink: (url, text) => hyperlinkToolbarView.editHyperlink(url, text),
    deleteHyperlink: () => hyperlinkToolbarView.deleteHyperlink(),
    startHideTimer: () => hyperlinkToolbarView.startMenuUpdateTimer(),
    stopHideTimer: () => hyperlinkToolbarView.stopMenuUpdateTimer(),
    destroy: () =>
      editor._tiptapEditor.unregisterPlugin(hyperlinkToolbarPluginKey),
  };
};
