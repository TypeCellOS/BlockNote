import { EditorOptions, createDocument } from "@tiptap/core";
// import "./blocknote.css";
import { Editor as TiptapEditor } from "@tiptap/core";
import { EditorView } from "@tiptap/pm/view";
import { EditorState } from "prosemirror-state";

// TiptapEditor.prototype.createView = function () {
//   debugger;
// };

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
  }

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

  public mount = (element: HTMLElement | null) => {
    console.log("mount", element);
    if (element === null) {
      this.destroy();
    } else {
      this.options.element = element;
      // @ts-ignore
      this.createViewAlternative();
    }
  };
}
