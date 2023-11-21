import { Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import {
  BaseUiElementCallbacks,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  InlineContentSchema,
  SpecificBlock,
  getDraggableBlockFromCoords,
} from "../..";
import { EventEmitter } from "../../shared/EventEmitter";
import { StyleSchema } from "../Blocks/api/styles";
export type TableHandlesCallbacks = BaseUiElementCallbacks;

export type TableHandlesState<
  BSchema extends BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  show: boolean;
  referencePosTop: { top: number; left: number };
  referencePosLeft: { top: number; left: number };
  colIndex: number;
  rowIndex: number;
  block: SpecificBlock<BSchema, "table", I, S>;
};

function getChildIndex(node: HTMLElement) {
  return Array.prototype.indexOf.call(node.parentElement!.childNodes, node);
}

function domCellAround(target: HTMLElement | null): HTMLElement | null {
  while (target && target.nodeName !== "TD" && target.nodeName !== "TH")
    target =
      target.classList && target.classList.contains("ProseMirror")
        ? null
        : (target.parentNode as HTMLElement);
  return target;
}

export class TableHandlesView<
  BSchema extends BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
  I extends InlineContentSchema,
  S extends StyleSchema
> {
  private state?: TableHandlesState<BSchema, I, S>;
  public updateState: () => void;

  public prevWasEditable: boolean | null = null;

  constructor(
    private readonly editor: BlockNoteEditor<BSchema, I, S>,
    private readonly pmView: EditorView,
    updateState: (state: TableHandlesState<BSchema, I, S>) => void
  ) {
    this.updateState = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized image toolbar");
      }

      updateState(this.state);
    };

    pmView.dom.addEventListener("mousemove", this.mouseMoveHandler);

    // pmView.dom.addEventListener("dragstart", this.dragstartHandler);

    // pmView.dom.addEventListener("blur", this.blurHandler);

    // document.addEventListener("scroll", this.scrollHandler);
  }

  mouseMoveHandler = (event: MouseEvent) => {
    // console.log("mousemove");
    const target = domCellAround(event.target as HTMLElement);

    if (!target) {
      if (this.state?.show) {
        this.state.show = false;
        this.updateState();
      }
      return;
    }

    const colIndex = getChildIndex(target);
    const rowIndex = getChildIndex(target.parentElement!);
    const cellRect = target.getBoundingClientRect();
    const tableRect =
      target.parentElement!.parentElement!.getBoundingClientRect();

    const blockEl = getDraggableBlockFromCoords(cellRect, this.pmView);
    const block = this.editor.getBlock(blockEl!.id)! as any as SpecificBlock<
      BSchema,
      "table",
      I,
      S
    >;

    this.state = {
      referencePosLeft: {
        top: cellRect.top + cellRect.height / 2,
        left: tableRect.left,
      },
      referencePosTop: {
        top: tableRect.top,
        left: cellRect.left + cellRect.width / 2,
      },
      colIndex,
      rowIndex,
      show: true,
      block,
    };
    this.updateState();
  };

  // // For dragging the whole editor.
  // dragstartHandler = () => {
  //   if (this.imageToolbarState?.show) {
  //     this.imageToolbarState.show = false;
  //     this.updateImageToolbar();
  //   }
  // };

  // blurHandler = (event: FocusEvent) => {
  //   const editorWrapper = this.pmView.dom.parentElement!;

  //   // Checks if the focus is moving to an element outside the editor. If it is,
  //   // the toolbar is hidden.
  //   if (
  //     // An element is clicked.
  //     event &&
  //     event.relatedTarget &&
  //     // Element is inside the editor.
  //     (editorWrapper === (event.relatedTarget as Node) ||
  //       editorWrapper.contains(event.relatedTarget as Node))
  //   ) {
  //     return;
  //   }

  //   if (this.imageToolbarState?.show) {
  //     this.imageToolbarState.show = false;
  //     this.updateImageToolbar();
  //   }
  // };

  // scrollHandler = () => {
  //   if (this.imageToolbarState?.show) {
  //     const blockElement = document.querySelector(
  //       `[data-node-type="blockContainer"][data-id="${this.imageToolbarState.block.id}"]`
  //     )!;

  //     this.imageToolbarState.referencePos =
  //       blockElement.getBoundingClientRect();
  //     this.updateImageToolbar();
  //   }
  // };

  // update(view: EditorView, prevState: EditorState) {
  //   const pluginState: {
  //     block: Block<(typeof Image)["config"]>;
  //   } = this.pluginKey.getState(view.state);

  // if (!this.imageToolbarState?.show && pluginState.block) {
  //   const blockElement = document.querySelector(
  //     `[data-node-type="blockContainer"][data-id="${pluginState.block.id}"]`
  //   )!;

  //   this.imageToolbarState = {
  //     show: true,
  //     referencePos: blockElement.getBoundingClientRect(),
  //     block: pluginState.block,
  //   };

  //   this.updateImageToolbar();

  //   return;
  // }

  // if (
  //   !view.state.selection.eq(prevState.selection) ||
  //   !view.state.doc.eq(prevState.doc)
  // ) {
  //   if (this.imageToolbarState?.show) {
  //     this.imageToolbarState.show = false;

  //     this.updateImageToolbar();
  //   }
  // }
  // }

  destroy() {
    this.pmView.dom.removeEventListener("mousedown", this.mouseMoveHandler);

    // this.pmView.dom.removeEventListener("dragstart", this.dragstartHandler);

    // this.pmView.dom.removeEventListener("blur", this.blurHandler);

    // document.removeEventListener("scroll", this.scrollHandler);
  }
}

export const tableHandlesPluginKey = new PluginKey("TableHandlesPlugin");

export class TableHandlesProsemirrorPlugin<
  BSchema extends BlockSchemaWithBlock<"table", DefaultBlockSchema["table"]>,
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  private view: TableHandlesView<BSchema, I, S> | undefined;
  public readonly plugin: Plugin;

  constructor(editor: BlockNoteEditor<BSchema, I, S>) {
    super();
    this.plugin = new Plugin<{
      block: SpecificBlock<BSchema, "table", I, S> | undefined;
    }>({
      key: tableHandlesPluginKey,
      view: (editorView) => {
        this.view = new TableHandlesView(editor, editorView, (state) => {
          this.emit("update", state);
        });
        return this.view;
      },
      state: {
        init: () => {
          return {
            block: undefined,
          };
        },
        apply: (transaction) => {
          const block: SpecificBlock<BSchema, "table", I, S> | undefined =
            transaction.getMeta(tableHandlesPluginKey)?.block;

          return {
            block,
          };
        },
      },
    });
  }

  public onUpdate(callback: (state: TableHandlesState<BSchema, I, S>) => void) {
    return this.on("update", callback);
  }
}
