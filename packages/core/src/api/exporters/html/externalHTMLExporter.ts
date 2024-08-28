import { DOMSerializer, Fragment, Node, Schema } from "prosemirror-model";

import { PartialBlock } from "../../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../../schema";
import { esmDependencies } from "../../../util/esmDependencies";
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
  exportBlocks: (
    blocks: PartialBlock<BSchema, I, S>[],
    options: { document?: Document }
  ) => string;
  exportProseMirrorFragment: (
    fragment: Fragment,
    options: { document?: Document }
  ) => string;
}

// Needs to be sync because it's used in drag handler event (SideMenuPlugin)
// Ideally, call `await initializeESMDependencies()` before calling this function
export const createExternalHTMLExporter = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>
): ExternalHTMLExporter<BSchema, I, S> => {
  const deps = esmDependencies;

  if (!deps) {
    throw new Error(
      "External HTML exporter requires ESM dependencies to be initialized"
    );
  }

  const serializer = DOMSerializer.fromSchema(schema) as DOMSerializer & {
    serializeNodeInner: (
      node: Node,
      options: { document?: Document }
    ) => HTMLElement;
    exportProseMirrorFragment: (
      fragment: Fragment,
      options: { document?: Document }
    ) => string;
    exportBlocks: (
      blocks: PartialBlock<BSchema, I, S>[],
      options: { document?: Document }
    ) => string;
  };

  serializer.serializeNodeInner = (
    node: Node,
    options: { document?: Document }
  ) => serializeNodeInner(node, options, serializer, editor, true);

  // Like the `internalHTMLSerializer`, also uses `serializeProseMirrorFragment`
  // but additionally runs it through the `simplifyBlocks` rehype plugin to
  // convert the internal HTML to external.
  serializer.exportProseMirrorFragment = (fragment, options) => {
    const externalHTML = deps.unified
      .unified()
      .use(deps.rehypeParse.default, { fragment: true })
      .use(simplifyBlocks, {
        orderedListItemBlockTypes: new Set<string>(["numberedListItem"]),
        unorderedListItemBlockTypes: new Set<string>([
          "bulletListItem",
          "checkListItem",
        ]),
      })
      .use(deps.rehypeStringify.default)
      .processSync(serializeProseMirrorFragment(fragment, serializer, options));

    return externalHTML.value as string;
  };

  serializer.exportBlocks = (
    blocks: PartialBlock<BSchema, I, S>[],
    options
  ) => {
    const nodes = blocks.map((block) =>
      blockToNode(block, schema, editor.schema.styleSchema)
    );
    const blockGroup = schema.nodes["blockGroup"].create(null, nodes);

    return serializer.exportProseMirrorFragment(
      Fragment.from(blockGroup),
      options
    );
  };

  return serializer;
};
