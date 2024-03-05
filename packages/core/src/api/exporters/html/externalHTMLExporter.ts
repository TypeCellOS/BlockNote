import { DOMSerializer, Fragment, Node, Schema } from "prosemirror-model";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "../../../schema";
import { blockToNode } from "../../nodeConversions/nodeConversions";
import {
  serializeNodeInner,
  serializeProseMirrorFragment,
} from "./util/sharedHTMLConversion";
import { simplifyBlocks } from "./util/simplifyBlocksRehypePlugin";

// Used to export BlockNote blocks and ProseMirror nodes to HTML for use outside
// the editor. Blocks are exported using the `toExternalHTML` method in their
// `blockSpec`, or `toInternalHTML` if `toExternalHTML` is not defined.
//
// The HTML created by this serializer is different to what's rendered by the
// editor to the DOM. This also means that data is likely to be lost when
// converting back to original blocks. The differences in the output HTML are:
// 1. It doesn't include the `blockGroup` and `blockContainer` wrappers meaning
// that nesting is not preserved for non-list-item blocks.
// 2. `li` items in the output HTML are wrapped in `ul` or `ol` elements.
// 3. While nesting for list items is preserved, other types of blocks nested
// inside a list are un-nested and a new list is created after them.
// 4. The HTML is wrapped in a single `div` element.
//
// The serializer has 2 main methods:
// `exportBlocks`: Exports an array of blocks to HTML.
// `exportFragment`: Exports a ProseMirror fragment to HTML. This is mostly
// useful if you want to export a selection which may not start/end at the
// start/end of a block.
export interface ExternalHTMLExporter<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> {
  exportBlocks: (blocks: PartialBlock<BSchema, I, S>[]) => string;
  exportProseMirrorFragment: (fragment: Fragment) => string;
}

export const createExternalHTMLExporter = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>
): ExternalHTMLExporter<BSchema, I, S> => {
  const serializer = DOMSerializer.fromSchema(schema) as DOMSerializer & {
    serializeNodeInner: (
      node: Node,
      options: { document?: Document }
    ) => HTMLElement;
    // TODO: Should not be async, but is since we're using a rehype plugin to
    //  convert internal HTML to external HTML.
    exportProseMirrorFragment: (fragment: Fragment) => string;
    exportBlocks: (blocks: PartialBlock<BSchema, I, S>[]) => string;
  };

  serializer.serializeNodeInner = (
    node: Node,
    options: { document?: Document }
  ) => serializeNodeInner(node, options, serializer, editor, true);

  // Like the `internalHTMLSerializer`, also uses `serializeProseMirrorFragment`
  // but additionally runs it through the `simplifyBlocks` rehype plugin to
  // convert the internal HTML to external.
  serializer.exportProseMirrorFragment = (fragment) => {
    const externalHTML = unified()
      .use(rehypeParse, { fragment: true })
      .use(simplifyBlocks, {
        orderedListItemBlockTypes: new Set<string>(["numberedListItem"]),
        unorderedListItemBlockTypes: new Set<string>(["bulletListItem"]),
      })
      .use(rehypeStringify)
      .processSync(serializeProseMirrorFragment(fragment, serializer));

    return externalHTML.value as string;
  };

  serializer.exportBlocks = (blocks: PartialBlock<BSchema, I, S>[]) => {
    const nodes = blocks.map((block) =>
      blockToNode(block, schema, editor.styleSchema)
    );
    const blockGroup = schema.nodes["blockGroup"].create(null, nodes);

    return serializer.exportProseMirrorFragment(Fragment.from(blockGroup));
  };

  return serializer;
};
