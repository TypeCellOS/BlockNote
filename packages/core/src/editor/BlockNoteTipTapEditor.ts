import { EditorOptions, createDocument } from "@tiptap/core";
// import "./blocknote.css";
import { Editor as TiptapEditor } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";

import { EditorState, Transaction } from "@tiptap/pm/state";
import { blockToNode } from "../api/nodeConversions/nodeConversions";
import { PartialBlock } from "../blocks/defaultBlocks";
import { StyleSchema } from "../schema";

export type BlockNoteTipTapEditorOptions = Partial<
  Omit<EditorOptions, "content">
> & {
  content: PartialBlock<any, any, any>[];
};

/**
 * Custom Editor class that extends TiptapEditor and separates
 * the creation of the view from the constructor.
 */
// @ts-ignore
export class BlockNoteTipTapEditor extends TiptapEditor {
  private _state: EditorState;

  constructor(options: BlockNoteTipTapEditorOptions, styleSchema: StyleSchema) {
    // possible fix for next.js server side rendering
    // const d = globalThis.document;
    // const w = globalThis.window;
    // if (!globalThis.document) {
    //   globalThis.document = {
    //     createElement: () => {},
    //   };
    // }
    // if (!globalThis.window) {
    //   globalThis.window = {
    //     setTimeout: () => {},
    //   };
    // }
    // options.injectCSS = false
    super({ ...options, content: undefined });

    // try {
    //   globalThis.window = w;
    //   } catch(e) {}
    //   try {
    //     globalThis.document = d;
    //     } catch(e) {}

    // This is a hack to make "initial content detection" by y-prosemirror (and also tiptap isEmpty)
    // properly detect whether or not the document has changed.
    // We change the doc.createAndFill function to make sure the initial block id is set, instead of null
    const schema = this.schema;
    let cache: any;
    const oldCreateAndFill = schema.nodes.doc.createAndFill;
    (schema.nodes.doc as any).createAndFill = (...args: any) => {
      if (cache) {
        return cache;
      }
      const ret = oldCreateAndFill.apply(schema.nodes.doc, args);

      // create a copy that we can mutate (otherwise, assigning attrs is not safe and corrupts the pm state)
      const jsonNode = JSON.parse(JSON.stringify(ret!.toJSON()));
      jsonNode.content[0].content[0].attrs.id = "initialBlockId";

      cache = Node.fromJSON(schema, jsonNode);
      return cache;
    };

    let doc: Node;

    try {
      const pmNodes = options?.content.map((b) =>
        blockToNode(b, this.schema, styleSchema).toJSON()
      );
      doc = createDocument(
        {
          type: "doc",
          content: [
            {
              type: "blockGroup",
              content: pmNodes,
            },
          ],
        },
        this.schema,
        this.options.parseOptions
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        "Error creating document from blocks passed as `initialContent`. Caused by exception: ",
        e
      );
      throw new Error(
        "Error creating document from blocks passed as `initialContent`:\n" +
          +JSON.stringify(options.content)
      );
    }

    // Create state immediately, so that it's available independently from the View,
    // the way Prosemirror "intends it to be". This also makes sure that we can access
    // the state before the view is created / mounted.
    this._state = EditorState.create({
      doc,
      schema: this.schema,
      // selection: selection || undefined,
    });
  }

  get state() {
    if (this.view) {
      this._state = this.view.state;
    }
    return this._state;
  }

  dispatch(tr: Transaction) {
    if (this.view) {
      this.view.dispatch(tr);
    } else {
      // before view has been initialized
      this._state = this.state.apply(tr);
    }
  }

  /**
   * Replace the default `createView` method with a custom one - which we call on mount
   */
  private createViewAlternative() {
    // Without queueMicrotask, custom IC / styles will give a React FlushSync error
    queueMicrotask(() => {
      this.view = new EditorView(
        { mount: this.options.element as any }, // use mount option so that we reuse the existing element instead of creating a new one
        {
          ...this.options.editorProps,
          // @ts-ignore
          dispatchTransaction: this.dispatchTransaction.bind(this),
          state: this.state,
        }
      );

      // `editor.view` is not yet available at this time.
      // Therefore we will add all plugins and node views directly afterwards.
      const newState = this.state.reconfigure({
        plugins: this.extensionManager.plugins,
      });

      this.view.updateState(newState);

      this.createNodeViews();
    });
  }

  /**
   * Mounts / unmounts the editor to a dom element
   *
   * @param element DOM element to mount to, ur null / undefined to destroy
   */
  public mount = (element?: HTMLElement | null) => {
    if (!element) {
      this.destroy();
    } else {
      this.options.element = element;
      // @ts-ignore
      this.createViewAlternative();
    }
  };
}

(BlockNoteTipTapEditor.prototype as any).createView = () => {
  // no-op
  // Disable default call to `createView` in the Editor constructor.
  // We should call `createView` manually only when a DOM element is available
};
