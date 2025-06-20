import {
  Editor,
  EditorOptions,
  Editor as TiptapEditor,
  createDocument,
} from "@tiptap/core";

import { Node } from "@tiptap/pm/model";

import { EditorView } from "@tiptap/pm/view";

import { EditorState, Transaction } from "@tiptap/pm/state";
import { blockToNode } from "../api/nodeConversions/blockToNode.js";
import { PartialBlock } from "../blocks/defaultBlocks.js";
import { StyleSchema } from "../schema/index.js";
import type { BlockNoteEditor } from "./BlockNoteEditor.js";

export type BlockNoteTipTapEditorOptions = Partial<
  Omit<EditorOptions, "content">
> & {
  content: PartialBlock<any, any, any>[];
};

/**
 * Custom Editor class that extends TiptapEditor and separates
 * the creation of the view from the constructor.
 */
export class BlockNoteTipTapEditor extends TiptapEditor {
  private _state: EditorState;

  public static create = (
    options: BlockNoteTipTapEditorOptions,
    styleSchema: StyleSchema,
  ) => {
    // because we separate the constructor from the creation of the view,
    // we need to patch setTimeout to prevent this code from having any effect:
    // https://github.com/ueberdosis/tiptap/blob/45bac803283446795ad1b03f43d3746fa54a68ff/packages/core/src/Editor.ts#L117
    const oldSetTimeout = globalThis?.window?.setTimeout;
    if (typeof globalThis?.window?.setTimeout !== "undefined") {
      globalThis.window.setTimeout = (() => {
        return 0;
      }) as any;
    }
    try {
      return new BlockNoteTipTapEditor(options, styleSchema);
    } finally {
      if (oldSetTimeout) {
        globalThis.window.setTimeout = oldSetTimeout;
      }
    }
  };

  protected constructor(
    options: BlockNoteTipTapEditorOptions,
    styleSchema: StyleSchema,
  ) {
    // possible fix for next.js server side rendering
    // const d = globalThis.document;
    // const w = globalThis.window;
    // if (!globalThis.document) {
    //   globalThis.document = {
    //     createElement: () => {},
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
        blockToNode(b, this.schema, styleSchema).toJSON(),
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
        this.options.parseOptions,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        "Error creating document from blocks passed as `initialContent`. Caused by exception: ",
        e,
      );
      throw new Error(
        "Error creating document from blocks passed as `initialContent`:\n" +
          +JSON.stringify(options.content),
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

  dispatch(transaction: Transaction) {
    if (!this.view) {
      // before view has been initialized
      this._state = this.state.apply(transaction);
      this.emit("transaction", {
        editor: this,
        transaction,
      });
      return;
    }
    // This is a verbatim copy of the default dispatch method, but with the following changes:
    // - We provide the appendedTransactions to a new `v3-update` event
    // In the future, we can remove this dispatch method entirely and rely on the new `update` event signature which does what we want by providing the appendedTransactions
    ////////////////////////////////////////////////////////////////////////////////
    // if the editor / the view of the editor was destroyed
    // the transaction should not be dispatched as there is no view anymore.
    if (this.view.isDestroyed) {
      return;
    }

    if (this.isCapturingTransaction) {
      // Do the default capture behavior
      (this as any).dispatchTransaction(transaction);

      return;
    }

    const { state, transactions: appendedTransactions } =
      this.state.applyTransaction(transaction);
    const selectionHasChanged = !this.state.selection.eq(state.selection);

    this.emit("beforeTransaction", {
      editor: this,
      transaction,
      nextState: state,
    });
    this.view.updateState(state);
    this.emit("transaction", {
      editor: this,
      transaction,
    });

    if (selectionHasChanged) {
      this.emit("selectionUpdate", {
        editor: this,
        transaction,
      });
    }

    const focus = transaction.getMeta("focus");
    const blur = transaction.getMeta("blur");

    if (focus) {
      this.emit("focus", {
        editor: this,
        event: focus.event,
        transaction,
      });
    }

    if (blur) {
      this.emit("blur", {
        editor: this,
        event: blur.event,
        transaction,
      });
    }

    if (!transaction.docChanged || transaction.getMeta("preventUpdate")) {
      return;
    }

    this.emit("update", {
      editor: this,
      transaction,
    });
    this.emit("v3-update", {
      editor: this,
      transaction,
      appendedTransactions: appendedTransactions.slice(1),
    });
  }

  // a helper method that can enable plugins before the view has been initialized
  // currently only used for testing
  forceEnablePlugins() {
    if (this.view) {
      throw new Error(
        "forcePluginsEnabled called after view has been initialized",
      );
    }
    this._state = this.state.reconfigure({
      plugins: this.extensionManager.plugins,
    });
  }

  /**
   * Replace the default `createView` method with a custom one - which we call on mount
   */
  private createViewAlternative(
    blockNoteEditor: BlockNoteEditor<any, any, any>,
    contentComponent?: any,
  ) {
    (this as any).contentComponent = contentComponent;

    const markViews: any = {};
    this.extensionManager.extensions.forEach((extension) => {
      if (extension.type === "mark" && extension.config.addMarkView) {
        // Note: migrate to using `addMarkView` from tiptap as soon as this lands
        // (currently tiptap doesn't support markviews)
        markViews[extension.name] =
          extension.config.addMarkView(blockNoteEditor);
      }
    });

    this.view = new EditorView(
      { mount: this.options.element as any }, // use mount option so that we reuse the existing element instead of creating a new one
      {
        ...this.options.editorProps,
        // @ts-ignore
        dispatchTransaction: this.dispatch.bind(this),
        state: this.state,
        markViews,
        nodeViews: this.extensionManager.nodeViews,
      },
    );

    // `editor.view` is not yet available at this time.
    // Therefore we will add all plugins directly afterwards.
    //
    // To research: this is the default tiptap behavior, but might actually not be necessary
    // it feels like it's a workaround for plugins that don't account for the view not being available yet
    const newState = this.state.reconfigure({
      plugins: this.extensionManager.plugins,
    });

    this.view.updateState(newState);

    // emit the created event, call here manually because we blocked the default call in the constructor
    // (https://github.com/ueberdosis/tiptap/blob/45bac803283446795ad1b03f43d3746fa54a68ff/packages/core/src/Editor.ts#L117)
    this.commands.focus(
      this.options.autofocus ||
        this.options.element.getAttribute("data-bn-autofocus") === "true",
      { scrollIntoView: false },
    );
    this.emit("create", { editor: this });
    this.isInitialized = true;
  }

  /**
   * Mounts / unmounts the editor to a dom element
   *
   * @param element DOM element to mount to, ur null / undefined to destroy
   */
  public mount = (
    blockNoteEditor: BlockNoteEditor<any, any, any>,
    element?: HTMLElement | null,
    contentComponent?: any,
  ) => {
    if (!element) {
      this.destroy();
      this.isInitialized = false;
    } else {
      this.options.element = element;
      this.createViewAlternative(blockNoteEditor, contentComponent);
    }
  };
}

(BlockNoteTipTapEditor.prototype as any).createView = function () {
  // no-op
  // Disable default call to `createView` in the Editor constructor.
  // We should call `createView` manually only when a DOM element is available

  // additional fix because onPaste and onDrop depend on installing plugins in constructor which we don't support
  // (note: can probably be removed after tiptap upgrade fixed in 2.8.0)
  this.options.onPaste = this.options.onDrop = undefined;
};

declare module "@tiptap/core" {
  interface EditorEvents {
    /**
     * This is a custom event that will be emitted in Tiptap V3.
     * We use it to provide the appendedTransactions, until Tiptap V3 is released.
     */
    "v3-update": {
      editor: Editor;
      transaction: Transaction;
      appendedTransactions: Transaction[];
    };
  }
}
