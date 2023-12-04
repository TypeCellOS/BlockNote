import { getMarkRange, posToDOMRect, Range } from "@tiptap/core";
import { EditorView } from "@tiptap/pm/view";
import { Mark } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BaseUiElementState } from "../../extensions-shared/BaseUiElementTypes";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";

export type HyperlinkToolbarState = BaseUiElementState & {
  // The hovered hyperlink's URL, and the text it's displayed with in the
  // editor.
  url: string;
  text: string;
};

class HyperlinkToolbarView {
  private hyperlinkToolbarState?: HyperlinkToolbarState;
  public updateHyperlinkToolbar: () => void;

  menuUpdateTimer: ReturnType<typeof setTimeout> | undefined;
  startMenuUpdateTimer: () => void;
  stopMenuUpdateTimer: () => void;

  mouseHoveredHyperlinkMark: Mark | undefined;
  mouseHoveredHyperlinkMarkRange: Range | undefined;

  keyboardHoveredHyperlinkMark: Mark | undefined;
  keyboardHoveredHyperlinkMarkRange: Range | undefined;

  hyperlinkMark: Mark | undefined;
  hyperlinkMarkRange: Range | undefined;

  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    private readonly pmView: EditorView,
    updateHyperlinkToolbar: (
      hyperlinkToolbarState: HyperlinkToolbarState
    ) => void
  ) {
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

    this.pmView.dom.addEventListener("mouseover", this.mouseOverHandler);
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
        this.pmView.posAtDOM(hoveredHyperlinkElement, 0) + 1;
      const resolvedPosInHoveredHyperlinkMark = this.pmView.state.doc.resolve(
        posInHoveredHyperlinkMark
      );
      const marksAtPos = resolvedPosInHoveredHyperlinkMark.marks();

      for (const mark of marksAtPos) {
        if (
          mark.type.name === this.pmView.state.schema.mark("link").type.name
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
    const editorWrapper = this.pmView.dom.parentElement!;

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
          this.pmView,
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to
        );
        this.updateHyperlinkToolbar();
      }
    }
  };

  editHyperlink(url: string, text: string) {
    const tr = this.pmView.state.tr.insertText(
      text,
      this.hyperlinkMarkRange!.from,
      this.hyperlinkMarkRange!.to
    );
    tr.addMark(
      this.hyperlinkMarkRange!.from,
      this.hyperlinkMarkRange!.from + text.length,
      this.pmView.state.schema.mark("link", { href: url })
    );
    this.pmView.dispatch(tr);
    this.pmView.focus();

    if (this.hyperlinkToolbarState?.show) {
      this.hyperlinkToolbarState.show = false;
      this.updateHyperlinkToolbar();
    }
  }

  deleteHyperlink() {
    this.pmView.dispatch(
      this.pmView.state.tr
        .removeMark(
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to,
          this.hyperlinkMark!.type
        )
        .setMeta("preventAutolink", true)
    );
    this.pmView.focus();

    if (this.hyperlinkToolbarState?.show) {
      this.hyperlinkToolbarState.show = false;
      this.updateHyperlinkToolbar();
    }
  }

  update() {
    if (!this.pmView.hasFocus()) {
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
    if (this.pmView.state.selection.empty) {
      const marksAtPos = this.pmView.state.selection.$from.marks();

      for (const mark of marksAtPos) {
        if (
          mark.type.name === this.pmView.state.schema.mark("link").type.name
        ) {
          this.keyboardHoveredHyperlinkMark = mark;
          this.keyboardHoveredHyperlinkMarkRange =
            getMarkRange(
              this.pmView.state.selection.$from,
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
          this.pmView,
          this.hyperlinkMarkRange!.from,
          this.hyperlinkMarkRange!.to
        ),
        url: this.hyperlinkMark!.attrs.href,
        text: this.pmView.state.doc.textBetween(
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
    this.pmView.dom.removeEventListener("mouseover", this.mouseOverHandler);
    document.removeEventListener("scroll", this.scrollHandler);
    document.removeEventListener("click", this.clickHandler, true);
  }
}

export const hyperlinkToolbarPluginKey = new PluginKey(
  "HyperlinkToolbarPlugin"
);

export class HyperlinkToolbarProsemirrorPlugin<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  private view: HyperlinkToolbarView | undefined;
  public readonly plugin: Plugin;

  constructor(editor: BlockNoteEditor<BSchema, I, S>) {
    super();
    this.plugin = new Plugin({
      key: hyperlinkToolbarPluginKey,
      view: (editorView) => {
        this.view = new HyperlinkToolbarView(editor, editorView, (state) => {
          this.emit("update", state);
        });
        return this.view;
      },
    });
  }

  public onUpdate(callback: (state: HyperlinkToolbarState) => void) {
    return this.on("update", callback);
  }

  /**
   * Edit the currently hovered hyperlink.
   */
  public editHyperlink = (url: string, text: string) => {
    this.view!.editHyperlink(url, text);
  };

  /**
   * Delete the currently hovered hyperlink.
   */
  public deleteHyperlink = () => {
    this.view!.deleteHyperlink();
  };

  /**
   * When hovering on/off hyperlinks using the mouse cursor, the hyperlink
   * toolbar will open & close with a delay.
   *
   * This function starts the delay timer, and should be used for when the mouse cursor enters the hyperlink toolbar.
   */
  public startHideTimer = () => {
    this.view!.startMenuUpdateTimer();
  };

  /**
   * When hovering on/off hyperlinks using the mouse cursor, the hyperlink
   * toolbar will open & close with a delay.
   *
   * This function stops the delay timer, and should be used for when the mouse cursor exits the hyperlink toolbar.
   */
  public stopHideTimer = () => {
    this.view!.stopMenuUpdateTimer();
  };
}
