import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { EventEmitter } from "../../util/EventEmitter";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  SpecificBlock,
  StyleSchema,
} from "../../schema";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";

export type ImageToolbarData<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema = StyleSchema
> = {
  block: SpecificBlock<B, "image", I, S>;
};

export class ImageToolbarView<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> {
  private data?: ImageToolbarData<BSchema, I, S>;
  private position?: UiElementPosition;
  private readonly updateData: () => void;
  private readonly updatePosition: () => void;

  public prevWasEditable: boolean | null = null;

  constructor(
    private readonly pluginKey: PluginKey,
    private readonly pmView: EditorView,
    updateData: (data: ImageToolbarData<BSchema, I, S>) => void,
    updatePosition: (position: UiElementPosition) => void
  ) {
    this.updateData = () => {
      if (!this.data) {
        throw new Error("Attempting to update uninitialized image toolbar");
      }

      updateData(this.data);
    };

    this.updatePosition = () => {
      if (!this.position) {
        throw new Error("Attempting to update uninitialized image toolbar");
      }

      updatePosition(this.position);
    };

    pmView.dom.addEventListener("mousedown", this.mouseDownHandler);

    pmView.dom.addEventListener("dragstart", this.dragstartHandler);

    pmView.dom.addEventListener("blur", this.blurHandler);

    document.addEventListener("scroll", this.scrollHandler);
  }

  mouseDownHandler = () => {
    if (this.position?.show) {
      this.position.show = false;
      this.updatePosition();
    }
  };

  // For dragging the whole editor.
  dragstartHandler = () => {
    if (this.position?.show) {
      this.position.show = false;
      this.updatePosition();
    }
  };

  blurHandler = (event: FocusEvent) => {
    const editorWrapper = this.pmView.dom.parentElement!;

    // Checks if the focus is moving to an element outside the editor. If it is,
    // the toolbar is hidden.
    if (
      // An element is clicked.
      event &&
      event.relatedTarget &&
      // Element is inside the editor.
      (editorWrapper === (event.relatedTarget as Node) ||
        editorWrapper.contains(event.relatedTarget as Node))
    ) {
      return;
    }

    if (this.position?.show) {
      this.position.show = false;
      this.updatePosition();
    }
  };

  scrollHandler = () => {
    if (this.position?.show) {
      const blockElement = document.querySelector(
        `[data-node-type="blockContainer"][data-id="${this.data!.block.id}"]`
      )!;

      this.position.referencePos = blockElement.getBoundingClientRect();
      this.updatePosition();
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const pluginState: {
      block: SpecificBlock<BSchema, "image", I, S>;
    } = this.pluginKey.getState(view.state);

    if (!this.position?.show && pluginState.block) {
      const blockElement = document.querySelector(
        `[data-node-type="blockContainer"][data-id="${pluginState.block.id}"]`
      )!;

      this.data = {
        block: pluginState.block,
      };
      this.position = {
        show: true,
        referencePos: blockElement.getBoundingClientRect(),
      };

      this.updateData();
      this.updatePosition();

      return;
    }

    if (
      !view.state.selection.eq(prevState.selection) ||
      !view.state.doc.eq(prevState.doc)
    ) {
      if (this.position?.show) {
        this.position.show = false;

        this.updatePosition();
      }
    }
  }

  destroy() {
    this.pmView.dom.removeEventListener("mousedown", this.mouseDownHandler);

    this.pmView.dom.removeEventListener("dragstart", this.dragstartHandler);

    this.pmView.dom.removeEventListener("blur", this.blurHandler);

    document.removeEventListener("scroll", this.scrollHandler);
  }
}

export const imageToolbarPluginKey = new PluginKey("ImageToolbarPlugin");

export class ImageToolbarProsemirrorPlugin<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  private view: ImageToolbarView<BSchema, I, S> | undefined;
  public readonly plugin: Plugin;

  constructor(_editor: BlockNoteEditor<BSchema, I, S>) {
    super();
    this.plugin = new Plugin<{
      block: SpecificBlock<BSchema, "image", I, S> | undefined;
    }>({
      key: imageToolbarPluginKey,
      view: (editorView) => {
        this.view = new ImageToolbarView(
          // editor,
          imageToolbarPluginKey,
          editorView,
          (data) => {
            this.emit("update data", data);
          },
          (position) => {
            this.emit("update position", position);
          }
        );
        return this.view;
      },
      state: {
        init: () => {
          return {
            block: undefined,
          };
        },
        apply: (transaction) => {
          const block: SpecificBlock<BSchema, "image", I, S> | undefined =
            transaction.getMeta(imageToolbarPluginKey)?.block;

          return {
            block,
          };
        },
      },
    });
  }

  public onDataUpdate(
    callback: (data: ImageToolbarData<BSchema, I, S>) => void
  ) {
    return this.on("update data", callback);
  }

  public onPositionUpdate(callback: (position: UiElementPosition) => void) {
    return this.on("update position", callback);
  }
}
