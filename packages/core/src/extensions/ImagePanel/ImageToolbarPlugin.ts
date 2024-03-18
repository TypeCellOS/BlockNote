import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import type {
  BlockFromConfig,
  InlineContentSchema,
  StyleSchema,
} from "../../schema";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";
import { EventEmitter } from "../../util/EventEmitter";
import { DefaultBlockSchema } from "../../blocks/defaultBlocks";

export type ImagePanelState<
  I extends InlineContentSchema,
  S extends StyleSchema
> = UiElementPosition & {
  // TODO: This typing is not quite right (children should be from BSchema)
  block: BlockFromConfig<DefaultBlockSchema["image"], I, S>;
};

export class ImagePanelView<
  I extends InlineContentSchema,
  S extends StyleSchema
> {
  public state?: ImagePanelState<I, S>;
  public emitUpdate: () => void;

  public prevWasEditable: boolean | null = null;

  constructor(
    private readonly pluginKey: PluginKey,
    private readonly pmView: EditorView,
    emitUpdate: (state: ImagePanelState<I, S>) => void
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized image panel");
      }

      emitUpdate(this.state);
    };

    pmView.dom.addEventListener("mousedown", this.mouseDownHandler);

    pmView.dom.addEventListener("dragstart", this.dragstartHandler);

    pmView.dom.addEventListener("blur", this.blurHandler);

    document.addEventListener("scroll", this.scrollHandler);
  }

  mouseDownHandler = () => {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

  // For dragging the whole editor.
  dragstartHandler = () => {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

  blurHandler = (event: FocusEvent) => {
    const editorWrapper = this.pmView.dom.parentElement!;

    // Checks if the focus is moving to an element outside the editor. If it is,
    // the panel is hidden.
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

    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

  scrollHandler = () => {
    if (this.state?.show) {
      const blockElement = document.querySelector(
        `[data-node-type="blockContainer"][data-id="${this.state.block.id}"]`
      )!;

      this.state.referencePos = blockElement.getBoundingClientRect();
      this.emitUpdate();
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const pluginState: {
      block: BlockFromConfig<DefaultBlockSchema["image"], I, S>;
    } = this.pluginKey.getState(view.state);

    if (!this.state?.show && pluginState.block) {
      const blockElement = document.querySelector(
        `[data-node-type="blockContainer"][data-id="${pluginState.block.id}"]`
      )!;

      this.state = {
        show: true,
        referencePos: blockElement.getBoundingClientRect(),
        block: pluginState.block,
      };

      this.emitUpdate();

      return;
    }

    if (
      !view.state.selection.eq(prevState.selection) ||
      !view.state.doc.eq(prevState.doc)
    ) {
      if (this.state?.show) {
        this.state.show = false;

        this.emitUpdate();
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

const imagePanelPluginKey = new PluginKey("ImagePanelPlugin");

export class ImagePanelProsemirrorPlugin<
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  private view: ImagePanelView<I, S> | undefined;
  public readonly plugin: Plugin;

  constructor(
    _editor: BlockNoteEditor<{ image: DefaultBlockSchema["image"] }, I, S>
  ) {
    super();
    this.plugin = new Plugin<{
      block: BlockFromConfig<DefaultBlockSchema["image"], I, S> | undefined;
    }>({
      key: imagePanelPluginKey,
      view: (editorView) => {
        this.view = new ImagePanelView(
          // editor,
          imagePanelPluginKey,
          editorView,
          (state) => {
            this.emit("update", state);
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
          const block:
            | BlockFromConfig<DefaultBlockSchema["image"], I, S>
            | undefined = transaction.getMeta(imagePanelPluginKey)?.block;

          return {
            block,
          };
        },
      },
    });
  }

  public onUpdate(callback: (state: ImagePanelState<I, S>) => void) {
    return this.on("update", callback);
  }
}
