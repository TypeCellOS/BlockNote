import { isNodeSelection, posToDOMRect } from "@tiptap/core";
import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { Block } from "../../blocks/defaultBlocks";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";
import { EventEmitter } from "../../util/EventEmitter";

export type AIInlineToolbarState = UiElementPosition & {
  prompt: string;
  originalContent: Block<any, any, any>[];
};

export class AIInlineToolbarView implements PluginView {
  public state?: AIInlineToolbarState;
  public emitUpdate: () => void;

  constructor(
    private readonly pmView: EditorView,
    emitUpdate: (state: AIInlineToolbarState) => void
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized AI toolbar");
      }

      emitUpdate(this.state);
    };

    pmView.dom.addEventListener("dragstart", this.dragHandler);
    pmView.dom.addEventListener("dragover", this.dragHandler);
    pmView.dom.addEventListener("blur", this.blurHandler);
    pmView.dom.addEventListener("mousedown", this.closeHandler, true);
    pmView.dom.addEventListener("keydown", this.closeHandler, true);

    // Setting capture=true ensures that any parent container of the editor that
    // gets scrolled will trigger the scroll event. Scroll events do not bubble
    // and so won't propagate to the document by default.
    pmView.root.addEventListener("scroll", this.scrollHandler, true);
  }

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
        editorWrapper.contains(event.relatedTarget as Node) ||
        (event.relatedTarget as HTMLElement).matches(
          ".bn-ui-container, .bn-ui-container *"
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
      this.state.referencePos = this.getSelectionBoundingBox();
      this.emitUpdate();
    }
  };

  update(view: EditorView) {
    const pluginState: AIInlineToolbarPluginState =
      aiInlineToolbarPluginKey.getState(view.state);

    if (this.state && !this.state.show && !pluginState.open) {
      return;
    }

    if (pluginState.open) {
      this.state = {
        show: true,
        referencePos: this.getSelectionBoundingBox(),
        prompt: pluginState.prompt,
        originalContent: pluginState.originalContent,
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
    this.pmView.dom.removeEventListener("keydown", this.closeHandler);

    this.pmView.root.removeEventListener("scroll", this.scrollHandler, true);
  }

  open(prompt: string, originalContent: Block<any, any, any>[]) {
    this.pmView.focus();
    this.pmView.dispatch(
      this.pmView.state.tr.scrollIntoView().setMeta(aiInlineToolbarPluginKey, {
        open: true,
        prompt,
        originalContent,
      })
    );
  }

  close() {
    this.pmView.focus();
    this.pmView.dispatch(
      this.pmView.state.tr.scrollIntoView().setMeta(aiInlineToolbarPluginKey, {
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

  getSelectionBoundingBox() {
    const { state } = this.pmView;
    const { selection } = state;

    // support for CellSelections
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));

    if (isNodeSelection(selection)) {
      const node = this.pmView.nodeDOM(from) as HTMLElement;

      if (node) {
        return node.getBoundingClientRect();
      }
    }

    return posToDOMRect(this.pmView, from, to);
  }
}

type AIInlineToolbarPluginState =
  | { open: true; prompt: string; originalContent: Block<any, any, any>[] }
  | { open: false };

export const aiInlineToolbarPluginKey = new PluginKey("AIInlineToolbarPlugin");

export class AIInlineToolbarProsemirrorPlugin extends EventEmitter<any> {
  private view: AIInlineToolbarView | undefined;
  public readonly plugin: Plugin;
  constructor() {
    super();

    this.plugin = new Plugin({
      key: aiInlineToolbarPluginKey,

      view: (editorView) => {
        this.view = new AIInlineToolbarView(editorView, (state) => {
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
            transaction.getMeta(aiInlineToolbarPluginKey);

          if (meta === undefined) {
            return prev;
          }

          return meta;
        },
      },
    });
  }

  public open(prompt: string, originalContent: Block<any, any, any>[]) {
    this.view?.open(prompt, originalContent);
  }

  public close() {
    this.view?.close();
  }

  public get shown() {
    return this.view?.state?.show || false;
  }

  public onUpdate(callback: (state: AIInlineToolbarState) => void) {
    return this.on("update", callback);
  }

  public closeMenu = () => this.view!.closeMenu();
}
