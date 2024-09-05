import { createDocument } from "@tiptap/core";
// import "./blocknote.css";
import { Node } from "@tiptap/pm/model";

import { EditorState } from "@tiptap/pm/state";
import { blockToNode } from "../api/nodeConversions/nodeConversions";
import { StyleSchema } from "../schema";

export class StateManager {
  constructor(options: BlockNoteTipTapEditorOptions, styleSchema: StyleSchema) {
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
}
