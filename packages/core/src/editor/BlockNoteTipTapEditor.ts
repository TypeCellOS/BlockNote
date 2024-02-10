import { EditorOptions, createDocument } from "@tiptap/core";
// import "./blocknote.css";
import { Editor as TiptapEditor } from "@tiptap/core";
import { EditorView } from "@tiptap/pm/view";
import { EditorState } from "prosemirror-state";

/**
 * Custom Editor class that extends TiptapEditor and separates
 * the creation of the view from the constructor.
 */
// @ts-ignore
export class BlockNoteTipTapEditor extends TiptapEditor {
  private _state: EditorState;

  constructor(options?: Partial<EditorOptions>) {
    super(options);

    const doc = createDocument(
      this.options.content,
      this.schema,
      this.options.parseOptions
    );
    console.log("create state");

    // Create state immediately, so that it's available independently from the View,
    // the way Prosemirror "intends it to be". This also makes sure that we can access
    // the state before the view is created / mounted.
    this._state = EditorState.create({
      doc,
      // selection: selection || undefined,
    });
  }

  get state() {
    if (this.view) {
      this._state = this.view.state;
    }
    return this._state;
  }

  createView() {
    // no-op
    // Disable default call to `createView` in the Editor constructor.
    // We should call `createView` manually only when a DOM element is available
  }

  /**
   * Replace the default `createView` method with a custom one - which we call on mount
   */
  private createViewAlternative() {
    this.view = new EditorView(this.options.element, {
      ...this.options.editorProps,
      // @ts-ignore
      dispatchTransaction: this.dispatchTransaction.bind(this),
      state: this.state,
    });

    // `editor.view` is not yet available at this time.
    // Therefore we will add all plugins and node views directly afterwards.
    const newState = this.state.reconfigure({
      plugins: this.extensionManager.plugins,
    });

    this.view.updateState(newState);

    this.createNodeViews();
  }

  /**
   * Mounts / unmounts the editor to a dom element
   *
   * @param element DOM element to mount to, ur null / undefined to destroy
   */
  public mount = (element?: HTMLElement | null) => {
    console.log("mount", element);
    if (!element) {
      this.destroy();
    } else {
      this.options.element = element;
      // @ts-ignore
      this.createViewAlternative();
    }
  };
}
