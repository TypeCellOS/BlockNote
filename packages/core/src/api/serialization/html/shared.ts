import { blockToNode } from "../../nodeConversions/nodeConversions";
import { DOMSerializer } from "prosemirror-model";
import {
  BlockSchemaWithBlock,
  PropSchema,
  SpecificBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { BlockNoteEditor } from "../../../BlockNoteEditor";

export function doc(options: { document?: Document }) {
  return options.document || window.document;
}

export const serializeBlockToHTMLDefault = <
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean
>(
  block: SpecificBlock<
    BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>,
    BType
  >,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
  >
) => {
  const node = blockToNode(block as any, editor._tiptapEditor.schema);

  if (
    editor._tiptapEditor.schema.nodes[node.type.name].spec.toDOM === undefined
  ) {
    throw new Error(
      "This block has no default HTML serialization as its corresponding TipTap node doesn't implement `renderHTML`."
    );
  }

  const serializer = DOMSerializer.fromSchema(editor._tiptapEditor.schema);

  return serializer.serializeNode(node.firstChild!) as HTMLElement;
};
