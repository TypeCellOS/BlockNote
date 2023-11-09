// TODO: IMO this should be part of the formatConversions file since the custom
//  serializer is used for all HTML & markdown conversions. I think this would
//  also clean up testing converting to clean HTML.
import { DOMSerializer, Fragment, Node, Schema } from "prosemirror-model";
import {
  blockToNode,
  nodeToBlock,
} from "../../nodeConversions/nodeConversions";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import {
  Block,
  BlockSchema,
  PartialBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import { simplifyBlocks } from "../../formatConversions/simplifyBlocksRehypePlugin";
import rehypeStringify from "rehype-stringify";
import { doc } from "./shared";

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
export interface ExternalHTMLExporter<BSchema extends BlockSchema> {
  exportBlocks: (blocks: PartialBlock<BSchema>[]) => Promise<string>;
  exportProseMirrorFragment: (fragment: Fragment) => Promise<string>;
}

// TODO: This implementation obviously sucks. For now we're just doing the
//  exact same thing as the internal serializer, but using a rehype plugin to
//  convert the internal HTML to external HTML after.
export const createExternalHTMLExporter = <BSchema extends BlockSchema>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema>
): ExternalHTMLExporter<BSchema> => {
  const customSerializer = DOMSerializer.fromSchema(schema) as DOMSerializer & {
    serializeNodeInner: (
      node: Node,
      options: { document?: Document }
    ) => HTMLElement;
    // TODO: Should not be async
    exportBlocks: (blocks: PartialBlock<BSchema>[]) => Promise<string>;
    exportProseMirrorFragment: (fragment: Fragment) => Promise<string>;
  };

  customSerializer.serializeNodeInner = (
    node: Node,
    options: { document?: Document }
  ) => {
    const { dom, contentDOM } = DOMSerializer.renderSpec(
      doc(options),
      customSerializer.nodes[node.type.name](node)
    );

    if (contentDOM) {
      if (node.isLeaf) {
        throw new RangeError("Content hole not allowed in a leaf node spec");
      }

      // Checks if the block type is custom. Custom blocks don't implement a
      // `renderHTML` function in their TipTap node type, so `toDOM` also isn't
      // implemented in their ProseMirror node type.
      if (
        node.type.name === "blockContainer" &&
        node.firstChild!.type.spec.toDOM === undefined
      ) {
        // Renders block content using the custom `blockSpec`'s `serialize`
        // function.
        const blockContent = DOMSerializer.renderSpec(
          doc(options),
          editor.schema[
            node.firstChild!.type.name as keyof BSchema
          ].toExternalHTML(
            nodeToBlock<BlockSchema, keyof BlockSchema>(
              node,
              editor.schema,
              editor.blockCache as WeakMap<Node, Block<BlockSchema>>
            ),
            editor as BlockNoteEditor<BlockSchema>
          )
        );

        // Renders inline content.
        if (blockContent.contentDOM) {
          if (node.isLeaf) {
            throw new RangeError(
              "Content hole not allowed in a leaf node spec"
            );
          }

          blockContent.contentDOM.appendChild(
            customSerializer.serializeFragment(
              node.firstChild!.content,
              options
            )
          );
        }

        contentDOM.appendChild(blockContent.dom);

        // Renders nested blocks.
        if (node.childCount === 2) {
          customSerializer.serializeFragment(
            Fragment.from(node.content.lastChild),
            options,
            contentDOM
          );
        }
      } else {
        // Renders the block normally, i.e. using `toDOM`.
        customSerializer.serializeFragment(node.content, options, contentDOM);
      }
    }

    return dom as HTMLElement;
  };

  customSerializer.exportBlocks = async (blocks: PartialBlock<BSchema>[]) => {
    const nodes = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = editor._tiptapEditor.schema.nodes["blockGroup"].create(
      null,
      nodes
    );

    return await customSerializer.exportProseMirrorFragment(
      Fragment.from(blockGroup)
    );
  };

  customSerializer.exportProseMirrorFragment = async (fragment) => {
    const internalHTML = customSerializer.serializeFragment(fragment);
    const parent = document.createElement("div");
    parent.appendChild(internalHTML);

    const externalHTML = await unified()
      .use(rehypeParse, { fragment: true })
      .use(simplifyBlocks, {
        orderedListItemBlockTypes: new Set<string>(["numberedListItem"]),
        unorderedListItemBlockTypes: new Set<string>(["bulletListItem"]),
      })
      .use(rehypeStringify)
      .process(parent.innerHTML);

    return externalHTML.value as string;
  };

  return customSerializer;
};
