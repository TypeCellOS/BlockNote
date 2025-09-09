import { EditorState, Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { ySyncPluginKey } from "y-prosemirror";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import type {
  BlockFromConfig,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";

export type FilePanelState<
  I extends InlineContentSchema,
  S extends StyleSchema,
> = UiElementPosition & {
  // TODO: This typing is not quite right (children should be from BSchema)
  block: BlockFromConfig<any, I, S>;
};

export class FilePanelView<I extends InlineContentSchema, S extends StyleSchema>
  implements PluginView
{
  public state?: FilePanelState<I, S>;
  public emitUpdate: () => void;

  constructor(
    private readonly editor: BlockNoteEditor<Record<string, any>, I, S>,
    private readonly pluginKey: PluginKey<FilePanelState<I, S>>,
    private readonly pmView: EditorView,
    emitUpdate: (state: FilePanelState<I, S>) => void,
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized file panel");
      }

      emitUpdate(this.state);
    };

    pmView.dom.addEventListener("mousedown", this.mouseDownHandler);
    pmView.dom.addEventListener("dragstart", this.dragstartHandler);

    // Setting capture=true ensures that any parent container of the editor that
    // gets scrolled will trigger the scroll event. Scroll events do not bubble
    // and so won't propagate to the document by default.
    pmView.root.addEventListener("scroll", this.scrollHandler, true);
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

  scrollHandler = () => {
    if (this.state?.show) {
      const blockElement = this.pmView.root.querySelector(
        `[data-node-type="blockContainer"][data-id="${this.state.block.id}"]`,
      );
      if (!blockElement) {
        return;
      }
      this.state.referencePos = blockElement.getBoundingClientRect();
      this.emitUpdate();
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const pluginState = this.pluginKey.getState(view.state);
    const prevPluginState = this.pluginKey.getState(prevState);

    if (!this.state?.show && pluginState?.block && this.editor.isEditable) {
      const blockElement = this.pmView.root.querySelector(
        `[data-node-type="blockContainer"][data-id="${pluginState.block.id}"]`,
      );
      if (!blockElement) {
        return;
      }
      this.state = {
        show: true,
        referencePos: blockElement.getBoundingClientRect(),
        block: pluginState.block,
      };

      this.emitUpdate();

      return;
    }

    const isOpening = pluginState?.block && !prevPluginState?.block;
    const isClosing = !pluginState?.block && prevPluginState?.block;
    if (isOpening && this.state && !this.state.show) {
      this.state.show = true;
      this.emitUpdate();
    }
    if (isClosing && this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  }

  closeMenu = () => {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

  destroy() {
    this.pmView.dom.removeEventListener("mousedown", this.mouseDownHandler);

    this.pmView.dom.removeEventListener("dragstart", this.dragstartHandler);

    this.pmView.root.removeEventListener("scroll", this.scrollHandler, true);
  }
}

const filePanelPluginKey = new PluginKey<FilePanelState<any, any>>(
  "FilePanelPlugin",
);

export class FilePanelProsemirrorPlugin<
  I extends InlineContentSchema,
  S extends StyleSchema,
> extends BlockNoteExtension {
  public static key() {
    return "filePanel";
  }

  private view: FilePanelView<I, S> | undefined;

  constructor(editor: BlockNoteEditor<Record<string, any>, I, S>) {
    super();
    this.addProsemirrorPlugin(
      new Plugin<{
        block: BlockFromConfig<any, I, S> | undefined;
      }>({
        key: filePanelPluginKey,
        view: (editorView) => {
          this.view = new FilePanelView<I, S>(
            editor,
            filePanelPluginKey as any,
            editorView,
            (state) => {
              this.emit("update", state);
            },
          );
          return this.view;
        },
        props: {
          handleKeyDown: (_view, event: KeyboardEvent) => {
            if (event.key === "Escape" && this.shown) {
              this.view?.closeMenu();
              return true;
            }
            return false;
          },
        },
        state: {
          init: () => {
            return {
              block: undefined,
            };
          },
          apply: (transaction, prev) => {
            const state: FilePanelState<I, S> | undefined =
              transaction.getMeta(filePanelPluginKey);

            if (state) {
              return state;
            }

            if (
              !transaction.getMeta(ySyncPluginKey) &&
              (transaction.selectionSet || transaction.docChanged)
            ) {
              return { block: undefined };
            }
            return prev;
          },
        },
      }),
    );
  }

  public get shown() {
    return this.view?.state?.show || false;
  }

  public onUpdate(callback: (state: FilePanelState<I, S>) => void) {
    return this.on("update", callback);
  }

  public closeMenu = () => this.view?.closeMenu();
}
