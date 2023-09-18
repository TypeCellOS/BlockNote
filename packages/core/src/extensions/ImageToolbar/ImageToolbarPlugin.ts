import { Node as PMNode } from "prosemirror-model";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import {
  BaseUiElementCallbacks,
  BaseUiElementState,
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  SpecificBlock,
} from "../..";
import { EventEmitter } from "../../shared/EventEmitter";

export type ImageToolbarCallbacks = BaseUiElementCallbacks;

export type ImageToolbarState = BaseUiElementState & {
  block: SpecificBlock<
    BlockSchema & {
      image: BlockSpec<
        "image",
        {
          src: { default: string };
        },
        false
      >;
    },
    "image"
  >;
};

export class ImageToolbarView {
  private imageToolbarState?: ImageToolbarState;
  public updateImageToolbar: () => void;

  public prevWasEditable: boolean | null = null;

  public shouldShow: (state: EditorState) => boolean = (state) =>
    "node" in state.selection &&
    (state.selection.node as PMNode).type.name === "image" &&
    (state.selection.node as PMNode).attrs.src === "";

  constructor(
    private readonly pluginKey: PluginKey,
    private readonly pmView: EditorView,
    updateImageToolbar: (imageToolbarState: ImageToolbarState) => void
  ) {
    this.updateImageToolbar = () => {
      if (!this.imageToolbarState) {
        throw new Error("Attempting to update uninitialized image toolbar");
      }

      updateImageToolbar(this.imageToolbarState);
    };

    pmView.dom.addEventListener("mousedown", this.mouseDownHandler);

    pmView.dom.addEventListener("dragstart", this.dragstartHandler);

    pmView.dom.addEventListener("blur", this.blurHandler);

    document.addEventListener("scroll", this.scrollHandler);
  }

  mouseDownHandler = () => {
    if (this.imageToolbarState?.show) {
      this.imageToolbarState.show = false;
      this.updateImageToolbar();
    }
  };

  // For dragging the whole editor.
  dragstartHandler = () => {
    if (this.imageToolbarState?.show) {
      this.imageToolbarState.show = false;
      this.updateImageToolbar();
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

    if (this.imageToolbarState?.show) {
      this.imageToolbarState.show = false;
      this.updateImageToolbar();
    }
  };

  scrollHandler = () => {
    if (this.imageToolbarState?.show) {
      const blockElement = document.querySelector(
        `[data-node-type="blockContainer"][data-id="${this.imageToolbarState.block.id}"]`
      )!;

      this.imageToolbarState.referencePos =
        blockElement.getBoundingClientRect();
      this.updateImageToolbar();
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const pluginState: {
      block: SpecificBlock<
        BlockSchema & {
          image: BlockSpec<
            "image",
            {
              src: { default: string };
            },
            false
          >;
        },
        "image"
      >;
    } = this.pluginKey.getState(view.state);

    if (!this.imageToolbarState?.show && pluginState.block) {
      const blockElement = document.querySelector(
        `[data-node-type="blockContainer"][data-id="${pluginState.block.id}"]`
      )!;

      this.imageToolbarState = {
        show: true,
        referencePos: blockElement.getBoundingClientRect(),
        block: pluginState.block,
      };

      this.updateImageToolbar();

      return;
    }

    if (
      !view.state.selection.eq(prevState.selection) ||
      !view.state.doc.eq(prevState.doc)
    ) {
      if (this.imageToolbarState?.show) {
        this.imageToolbarState.show = false;

        this.updateImageToolbar();
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
  BSchema extends BlockSchema
> extends EventEmitter<any> {
  private view: ImageToolbarView | undefined;
  public readonly plugin: Plugin;

  constructor(_editor: BlockNoteEditor<BSchema>) {
    super();
    this.plugin = new Plugin<{
      block:
        | SpecificBlock<
            BlockSchema & {
              image: BlockSpec<
                "image",
                {
                  src: { default: string };
                },
                false
              >;
            },
            "image"
          >
        | undefined;
    }>({
      key: imageToolbarPluginKey,
      view: (editorView) => {
        this.view = new ImageToolbarView(
          // editor,
          imageToolbarPluginKey,
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
            | SpecificBlock<
                BlockSchema & {
                  image: BlockSpec<
                    "image",
                    {
                      src: { default: string };
                    },
                    false
                  >;
                },
                "image"
              >
            | undefined = transaction.getMeta(imageToolbarPluginKey)?.block;

          return {
            block,
          };
        },
      },
    });
  }

  public onUpdate(callback: (state: ImageToolbarState) => void) {
    return this.on("update", callback);
  }
}
