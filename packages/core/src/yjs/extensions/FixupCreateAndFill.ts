import { createExtension } from "../../editor/BlockNoteExtension.js";
import { Node } from "prosemirror-model";

export const FixupCreateAndFillExtension = createExtension(({ editor }) => {
  editor.on("create", () => {
    // When y-prosemirror creates an empty document, the `blockContainer` node is created with an `id` of `null`.
    // This causes the unique id extension to generate a new id for the initial block, which is not what we want
    // Since it will be randomly generated & cause there to be more updates to the ydoc
    // This is a hack to make it so that anytime `schema.doc.createAndFill` is called, the initial block id is already set to "initialBlockId"
    let cache: Node | undefined = undefined;
    const oldCreateAndFill = editor.pmSchema.nodes.doc.createAndFill;
    editor.pmSchema.nodes.doc.createAndFill = ((...args: any) => {
      if (cache) {
        return cache;
      }
      const ret = oldCreateAndFill.apply(editor.pmSchema.nodes.doc, args)!;

      // create a copy that we can mutate (otherwise, assigning attrs is not safe and corrupts the pm state)
      const jsonNode = JSON.parse(JSON.stringify(ret.toJSON()));
      jsonNode.content[0].content[0].attrs.id = "initialBlockId";

      cache = Node.fromJSON(editor.pmSchema, jsonNode);
      return cache;
    }) as unknown as typeof editor.pmSchema.nodes.doc.createAndFill;
  });

  return {
    key: "fixupCreateAndFill",
  } as const;
});
