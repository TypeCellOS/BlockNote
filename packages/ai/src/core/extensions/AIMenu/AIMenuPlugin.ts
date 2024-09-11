import {
  EventEmitter,
  getBlockInfoFromPos,
  UiElementPosition,
} from "@blocknote/core";
import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

export type AIMenuState = UiElementPosition;

export class AIMenuView implements PluginView {
  public state?: AIMenuState;
  public emitUpdate: () => void;

  public domElement: HTMLElement | undefined;

  constructor(
    private readonly pmView: EditorView,
    emitUpdate: (state: AIMenuState) => void
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized AI menu");
      }

      emitUpdate(this.state);
    };

    pmView.dom.addEventListener("dragstart", this.dragHandler);
    pmView.dom.addEventListener("dragover", this.dragHandler);
    pmView.dom.addEventListener("blur", this.blurHandler);
    pmView.dom.addEventListener("mousedown", this.closeHandler, true);

    // Setting capture=true ensures that any parent container of the editor that
    // gets scrolled will trigger the scroll event. Scroll events do not bubble
    // and so won't propagate to the document by default.
    pmView.root.addEventListener("scroll", this.scrollHandler, true);
  }

  blurHandler = (event: FocusEvent) => {
    const editorWrapper = this.pmView.dom.parentElement!;

    // Checks if the focus is moving to an element outside the editor. If it is,
    // the menu is hidden.
    if (
      // An element is clicked.
      event &&
      event.relatedTarget &&
      // Element is inside the editor.
      (editorWrapper === (event.relatedTarget as Node) ||
        editorWrapper.contains(event.relatedTarget as Node) ||
        (event.relatedTarget as HTMLElement).matches(
          ".bn-container, .bn-container *"
        ))
    ) {
      return;
    }

    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

  // For dragging the whole editor.
  dragHandler = () => {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };

  closeHandler = () => this.close();

  scrollHandler = () => {
    if (this.state?.show) {
      this.state.referencePos = this.domElement!.getBoundingClientRect();
      this.emitUpdate();
    }
  };

  update(view: EditorView) {
    const pluginState: AIInlineToolbarPluginState = aiMenuPluginKey.getState(
      view.state
    );

    if (this.state && !this.state.show && !pluginState.open) {
      return;
    }

    if (pluginState.open) {
      const blockInfo = getBlockInfoFromPos(
        view.state.doc,
        view.state.selection.from
      );

      this.domElement = view.domAtPos(blockInfo.startPos).node
        .firstChild as HTMLElement;

      this.state = {
        show: true,
        referencePos: this.domElement.getBoundingClientRect(),
      };

      this.emitUpdate();

      return;
    }

    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  }

  destroy() {
    this.pmView.dom.removeEventListener("dragstart", this.dragHandler);
    this.pmView.dom.removeEventListener("dragover", this.dragHandler);
    this.pmView.dom.removeEventListener("blur", this.blurHandler);
    this.pmView.dom.removeEventListener("mousedown", this.closeHandler);

    this.pmView.root.removeEventListener("scroll", this.scrollHandler, true);
  }

  open() {
    this.pmView.focus();
    this.pmView.dispatch(
      this.pmView.state.tr.scrollIntoView().setMeta(aiMenuPluginKey, {
        open: true,
      })
    );
  }

  close() {
    this.pmView.focus();
    this.pmView.dispatch(
      this.pmView.state.tr.scrollIntoView().setMeta(aiMenuPluginKey, {
        open: false,
      })
    );
  }

  closeMenu = () => {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate();
    }
  };
}

type AIInlineToolbarPluginState = {
  open: boolean;
};

export const aiMenuPluginKey = new PluginKey("AIMenuPlugin");

export class AIMenuProsemirrorPlugin extends EventEmitter<any> {
  private view: AIMenuView | undefined;
  public readonly plugin: Plugin;
  constructor() {
    super();

    this.plugin = new Plugin({
      key: aiMenuPluginKey,

      view: (editorView) => {
        this.view = new AIMenuView(editorView, (state) => {
          this.emit("update", state);
        });
        return this.view;
      },

      state: {
        // Initialize the plugin's internal state.
        init(): AIInlineToolbarPluginState {
          return { open: false };
        },

        // Apply changes to the plugin state from an editor transaction.
        apply(transaction, prev) {
          const meta: AIInlineToolbarPluginState | undefined =
            transaction.getMeta(aiMenuPluginKey);

          if (meta === undefined) {
            return prev;
          }

          return meta;
        },
      },
    });
  }

  public open() {
    this.view?.open();
  }

  public close() {
    this.view?.close();
  }

  public get shown() {
    return this.view?.state?.show || false;
  }

  public onUpdate(callback: (state: AIMenuState) => void) {
    return this.on("update", callback);
  }

  public closeMenu = () => this.view!.closeMenu();
}
