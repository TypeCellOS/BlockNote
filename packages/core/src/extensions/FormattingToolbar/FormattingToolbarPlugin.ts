import {
  Editor,
  isNodeSelection,
  isTextSelection,
  posToDOMRect,
} from "@tiptap/core";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { BlockNoteEditor } from "../..";
import { Block, PartialBlock } from "../Blocks/api/blockTypes";
import { getBlockInfoFromPos } from "../Blocks/helpers/getBlockInfoFromPos";
import {
  FormattingToolbar,
  FormattingToolbarDynamicParams,
  FormattingToolbarFactory,
  FormattingToolbarStaticParams,
} from "./FormattingToolbarFactoryTypes";

// Same as TipTap bubblemenu plugin, but with these changes:
// https://github.com/ueberdosis/tiptap/pull/2596/files
export interface FormattingToolbarPluginProps {
  pluginKey: PluginKey;
  tiptapEditor: Editor;
  editor: BlockNoteEditor;
  formattingToolbarFactory: FormattingToolbarFactory;
  shouldShow?:
    | ((props: {
        editor: BlockNoteEditor;
        view: EditorView;
        state: EditorState;
        oldState?: EditorState;
        from: number;
        to: number;
      }) => boolean)
    | null;
}

export type FormattingToolbarViewProps = FormattingToolbarPluginProps & {
  view: EditorView;
};

export class FormattingToolbarView {
  public editor: BlockNoteEditor;
  private ttEditor: Editor;

  public view: EditorView;

  public formattingToolbar: FormattingToolbar;

  public preventHide = false;

  public preventShow = false;

  public toolbarIsOpen = false;

  public shouldShow: Exclude<FormattingToolbarPluginProps["shouldShow"], null> =
    ({ view, state, from, to }) => {
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
    tiptapEditor,
    formattingToolbarFactory,
    view,
    shouldShow,
  }: FormattingToolbarViewProps) {
    this.editor = editor;
    this.ttEditor = tiptapEditor;
    this.view = view;

    this.formattingToolbar = formattingToolbarFactory(this.getStaticParams());

    if (shouldShow) {
      this.shouldShow = shouldShow;
    }

    this.view.dom.addEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.addEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.addEventListener("dragstart", this.dragstartHandler);

    this.ttEditor.on("focus", this.focusHandler);
    this.ttEditor.on("blur", this.blurHandler);
  }

  viewMousedownHandler = () => {
    this.preventShow = true;
  };

  viewMouseupHandler = () => {
    this.preventShow = false;
    setTimeout(() => this.update(this.ttEditor.view));
  };

  dragstartHandler = () => {
    this.formattingToolbar.hide();
    this.toolbarIsOpen = false;
  };

  focusHandler = () => {
    // we use `setTimeout` to make sure `selection` is already updated
    setTimeout(() => this.update(this.ttEditor.view));
  };

  blurHandler = ({ event }: { event: FocusEvent }) => {
    if (this.preventHide) {
      this.preventHide = false;

      return;
    }

    if (
      event?.relatedTarget &&
      this.formattingToolbar.element?.parentNode?.contains(
        event.relatedTarget as Node
      )
    ) {
      return;
    }

    if (this.toolbarIsOpen) {
      this.formattingToolbar.hide();
      this.toolbarIsOpen = false;
    }
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
      !this.toolbarIsOpen &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      this.formattingToolbar.render(this.getDynamicParams(), true);
      this.toolbarIsOpen = true;

      // TODO: Is this necessary? Also for other menu plugins.
      // Listener stops focus moving to the menu on click.
      this.formattingToolbar.element!.addEventListener("mousedown", (event) =>
        event.preventDefault()
      );

      return;
    }

    // Checks if menu should be updated.
    if (
      this.toolbarIsOpen &&
      !this.preventShow &&
      (shouldShow || this.preventHide)
    ) {
      this.formattingToolbar.render(this.getDynamicParams(), false);
      return;
    }

    // Checks if menu should be hidden.
    if (
      this.toolbarIsOpen &&
      !this.preventHide &&
      (!shouldShow || this.preventShow)
    ) {
      this.formattingToolbar.hide();
      this.toolbarIsOpen = false;

      // Listener stops focus moving to the menu on click.
      this.formattingToolbar.element!.removeEventListener(
        "mousedown",
        (event) => event.preventDefault()
      );

      return;
    }
  }

  destroy() {
    this.view.dom.removeEventListener("mousedown", this.viewMousedownHandler);
    this.view.dom.removeEventListener("mouseup", this.viewMouseupHandler);
    this.view.dom.removeEventListener("dragstart", this.dragstartHandler);

    this.ttEditor.off("focus", this.focusHandler);
    this.ttEditor.off("blur", this.blurHandler);
  }

  getSelectionBoundingBox() {
    const { state } = this.ttEditor.view;
    const { selection } = state;

    // support for CellSelections
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));

    if (isNodeSelection(selection)) {
      const node = this.ttEditor.view.nodeDOM(from) as HTMLElement;

      if (node) {
        return node.getBoundingClientRect();
      }
    }

    return posToDOMRect(this.ttEditor.view, from, to);
  }

  getStaticParams(): FormattingToolbarStaticParams {
    return {
      toggleBold: () => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.toggleBold();
      },
      toggleItalic: () => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.toggleItalic();
      },
      toggleUnderline: () => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.toggleUnderline();
      },
      toggleStrike: () => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.toggleStrike();
      },
      setHyperlink: (url: string, text?: string) => {
        if (url === "") {
          return;
        }

        let { from, to } = this.ttEditor.state.selection;

        if (!text) {
          text = this.ttEditor.state.doc.textBetween(from, to);
        }

        const mark = this.ttEditor.schema.mark("link", { href: url });

        this.ttEditor.view.dispatch(
          this.ttEditor.view.state.tr
            .insertText(text, from, to)
            .addMark(from, from + text.length, mark)
        );
        this.ttEditor.view.focus();
      },
      setTextColor: (color: string) => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.setTextColor(color);
      },
      setBackgroundColor: (color: string) => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.setBackgroundColor(color);
      },
      setTextAlignment: (
        textAlignment: "left" | "center" | "right" | "justify"
      ) => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.setTextAlignment(textAlignment);
      },
      increaseBlockIndent: () => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.sinkListItem("blockContainer");
      },
      decreaseBlockIndent: () => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.liftListItem("blockContainer");
      },
      // TODO: consider removing this method, and have clients use editor.updateBlock() instead
      updateBlock: (updatedBlock: PartialBlock) => {
        this.ttEditor.view.focus();
        this.ttEditor.commands.BNUpdateBlock(
          this.ttEditor.state.selection.from,
          updatedBlock
        );
        // this.editor.updateBlock(updatedBlock.id!, updatedBlock);
      },
    };
  }

  getDynamicParams(): FormattingToolbarDynamicParams {
    const blockInfo = getBlockInfoFromPos(
      this.ttEditor.state.doc,
      this.ttEditor.state.selection.from
    )!;

    return {
      boldIsActive: this.ttEditor.isActive("bold"),
      italicIsActive: this.ttEditor.isActive("italic"),
      underlineIsActive: this.ttEditor.isActive("underline"),
      strikeIsActive: this.ttEditor.isActive("strike"),
      hyperlinkIsActive: this.ttEditor.isActive("link"),
      activeHyperlinkUrl: this.ttEditor.getAttributes("link").href || "",
      activeHyperlinkText: this.ttEditor.state.doc.textBetween(
        this.ttEditor.state.selection.from,
        this.ttEditor.state.selection.to
      ),
      textColor: this.ttEditor.getAttributes("textColor").color || "default",
      backgroundColor:
        this.ttEditor.getAttributes("backgroundColor").color || "default",
      textAlignment:
        this.ttEditor.getAttributes(blockInfo.contentType).textAlignment ||
        "left",
      canIncreaseBlockIndent:
        this.ttEditor.state.doc
          .resolve(blockInfo.startPos)
          .index(blockInfo.depth - 1) > 0,
      canDecreaseBlockIndent: blockInfo.depth > 2,
      // Needs type cast as there is no way to create a type that dynamically updates based on which extensions are
      // loaded by the editor.
      block: {
        type: blockInfo.contentType.name,
        props: blockInfo.contentNode.attrs,
      } as Block,
      referenceRect: this.getSelectionBoundingBox(),
    };
  }
}

export const createFormattingToolbarPlugin = (
  options: FormattingToolbarPluginProps
) => {
  return new Plugin({
    key: new PluginKey("FormattingToolbarPlugin"),
    view: (view) => new FormattingToolbarView({ view, ...options }),
  });
};
