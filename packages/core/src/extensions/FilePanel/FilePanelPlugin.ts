import { EditorState, Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";
import type {
  BlockFromConfig,
  FileBlockConfig,
  InlineContentSchema,
  StyleSchema,
} from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";

export type FilePanelState<
  I extends InlineContentSchema,
  S extends StyleSchema
> = UiElementPosition & {
  // TODO: This typing is not quite right (children should be from BSchema)
  block: BlockFromConfig<FileBlockConfig, I, S>;
};

export class FilePanelView<I extends InlineContentSchema, S extends StyleSchema>
  implements PluginView
{
  public state?: FilePanelState<I, S>;
  public emitUpdate: () => void;

  constructor(
    private readonly editor: BlockNoteEditor<
      Record<string, FileBlockConfig>,
      I,
      S
    >,
    private readonly pluginKey: PluginKey,
    private readonly pmView: EditorView,
    emitUpdate: (state: FilePanelState<I, S>) => void
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
        `[data-node-type="blockContainer"][data-id="${this.state.block.id}"]`
      )!;

      this.state.referencePos = blockElement.getBoundingClientRect();
      this.emitUpdate();
    }
  };

  update(view: EditorView, prevState: EditorState) {
    const pluginState: {
      block: BlockFromConfig<FileBlockConfig, I, S>;
    } = this.pluginKey.getState(view.state);

    if (!this.state?.show && pluginState.block && this.editor.isEditable) {
      const blockElement = this.pmView.root.querySelector(
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
      !view.state.doc.eq(prevState.doc) ||
      !this.editor.isEditable
    ) {
      if (this.state?.show) {
        this.state.show = false;

        this.emitUpdate();
      }
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

const filePanelPluginKey = new PluginKey("FilePanelPlugin");

export class FilePanelProsemirrorPlugin<
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  private view: FilePanelView<I, S> | undefined;
  public readonly plugin: Plugin;

  constructor(editor: BlockNoteEditor<Record<string, FileBlockConfig>, I, S>) {
    super();
    this.plugin = new Plugin<{
      block: BlockFromConfig<FileBlockConfig, I, S> | undefined;
    }>({
      key: filePanelPluginKey,
      view: (editorView) => {
        this.view = new FilePanelView<I, S>(
          editor,
          filePanelPluginKey,
          editorView,
          (state) => {
            this.emit("update", state);
          }
        );
        return this.view;
      },
      props: {
        handleKeyDown: (_view, event: KeyboardEvent) => {
          if (event.key === "Escape" && this.shown) {
            this.view!.closeMenu();
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
        apply: (transaction) => {
          const block: BlockFromConfig<FileBlockConfig, I, S> | undefined =
            transaction.getMeta(filePanelPluginKey)?.block;

          return {
            block,
          };
        },
      },
    });
  }

  public get shown() {
    return this.view?.state?.show || false;
  }

  public onUpdate(callback: (state: FilePanelState<I, S>) => void) {
    return this.on("update", callback);
  }

  public closeMenu = () => this.view!.closeMenu();
}
