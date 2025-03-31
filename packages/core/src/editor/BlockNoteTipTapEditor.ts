import { EditorOptions, createDocument } from "@tiptap/core";
// import "./blocknote.css";
import { Editor as TiptapEditor } from "@tiptap/core";

import { Node } from "@tiptap/pm/model";

import { EditorState, Transaction } from "@tiptap/pm/state";
import { blockToNode } from "../api/nodeConversions/blockToNode.js";
import { PartialBlock } from "../blocks/defaultBlocks.js";
import { StyleSchema } from "../schema/index.js";

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
  public static create = (
    options: BlockNoteTipTapEditorOptions,
    styleSchema: StyleSchema
  ) => {
    return new BlockNoteTipTapEditor(options, styleSchema);
  };

  protected constructor(
    options: BlockNoteTipTapEditorOptions,
    styleSchema: StyleSchema
  ) {
    // options.injectCSS = false

    super({ ...options, content: undefined, element: null });
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

    // Leverage the fact that we know the view is not created yet, and quickly set the initial state
    this.view.updateState(
      EditorState.create({
        doc,
        schema: this.schema,
      })
    );
  }

  dispatch(tr: Transaction) {
    this.view.dispatch(tr);
  }
}
