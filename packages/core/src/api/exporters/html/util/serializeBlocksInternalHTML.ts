import { DOMSerializer, Fragment, Node } from "prosemirror-model";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import {
  inlineContentToNodes,
  tableContentToNodes,
} from "../../../nodeConversions/blockToNode.js";

import { nodeToCustomInlineContent } from "../../../nodeConversions/nodeToBlock.js";
export function serializeInlineContentInternalHTML<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<any, I, S>,
  blockContent: PartialBlock<BSchema, I, S>["content"],
  serializer: DOMSerializer,
  blockType?: string,
  options?: { document?: Document },
) {
  let nodes: Node[];

  // TODO: reuse function from nodeconversions?
  if (!blockContent) {
    throw new Error("blockContent is required");
  } else if (typeof blockContent === "string") {
    nodes = inlineContentToNodes([blockContent], editor.pmSchema, blockType);
  } else if (Array.isArray(blockContent)) {
    nodes = inlineContentToNodes(blockContent, editor.pmSchema, blockType);
  } else if (blockContent.type === "tableContent") {
    nodes = tableContentToNodes(blockContent, editor.pmSchema);
  } else {
    throw new UnreachableCaseError(blockContent.type);
  }

  // Check if any of the nodes are custom inline content with toExternalHTML
  const doc = options?.document ?? document;
  const fragment = doc.createDocumentFragment();

  for (const node of nodes) {
    // Check if this is a custom inline content node with toExternalHTML
    if (
      node.type &&
      node.type.name &&
      editor.schema.inlineContentSchema[node.type.name]
    ) {
      const inlineContentImplementation =
        editor.inlineContentImplementations[node.type.name]?.implementation;

      if (inlineContentImplementation?.toExternalHTML) {
        // Convert the node to inline content format
        const inlineContent = nodeToCustomInlineContent(
          node,
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema,
        );

        // Use the custom toExternalHTML method
        const output = inlineContentImplementation.toExternalHTML(
          inlineContent as any,
          editor as any,
        );

        if (output) {
          fragment.appendChild(output.dom);

          // If contentDOM exists, render the inline content into it
          if (output.contentDOM) {
            const contentFragment = serializer.serializeFragment(
              node.content,
              options,
            );
            output.contentDOM.dataset.editable = "";
            output.contentDOM.appendChild(contentFragment);
          }
          continue;
        }
      }
    }

    // Fall back to default serialization for this node
    const nodeFragment = serializer.serializeFragment(
      Fragment.from([node]),
      options,
    );
    fragment.appendChild(nodeFragment);
  }

  return fragment;
}

function serializeBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  block: PartialBlock<BSchema, I, S>,
  serializer: DOMSerializer,
  listIndex: number,
  options?: { document?: Document },
) {
  const BC_NODE = editor.pmSchema.nodes["blockContainer"];

  // set default props in case we were passed a partial block
  const props = block.props || {};
  for (const [name, spec] of Object.entries(
    editor.schema.blockSchema[block.type as any].propSchema,
  )) {
    if (!(name in props) && spec.default !== undefined) {
      (props as any)[name] = spec.default;
    }
  }

  const impl = editor.blockImplementations[block.type as any].implementation;
  const ret = impl.render?.call({}, { ...block, props } as any, editor as any);

  if (block.type === "numberedListItem") {
    // This is a workaround to make sure there's a list index set.
    // Normally, this is set on the internal prosemirror nodes by the NumberedListIndexingPlugin,
    // but:
    // - (a) this information is not available on the Blocks passed to the serializer. (we only have access to BlockNote Blocks)
    // - (b) the NumberedListIndexingPlugin might not even have run, because we can manually call blocksToFullHTML
    //       with blocks that are not part of the active document
    if (ret.dom instanceof HTMLElement) {
      ret.dom.setAttribute("data-index", listIndex.toString());
    }
  }

  if (ret.contentDOM && block.content) {
    const ic = serializeInlineContentInternalHTML(
      editor,
      block.content as any, // TODO
      serializer,
      block.type,
      options,
    );
    ret.contentDOM.appendChild(ic);
  }

  const pmType = editor.pmSchema.nodes[block.type as any];

  if (pmType.isInGroup("bnBlock")) {
    if (block.children && block.children.length > 0) {
      const fragment = serializeBlocks(
        editor,
        block.children,
        serializer,
        options,
      );

      ret.contentDOM?.append(fragment);
    }
    return ret.dom;
  }

  // wrap the block in a blockContainer
  const bc = BC_NODE.spec?.toDOM?.(
    BC_NODE.create({
      id: block.id,
      ...props,
    }),
  ) as {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };

  bc.contentDOM?.appendChild(ret.dom);

  if (block.children && block.children.length > 0) {
    bc.contentDOM?.appendChild(
      serializeBlocksInternalHTML(editor, block.children, serializer, options),
    );
  }
  return bc.dom;
}

function serializeBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blocks: PartialBlock<BSchema, I, S>[],
  serializer: DOMSerializer,
  options?: { document?: Document },
) {
  const doc = options?.document ?? document;
  const fragment = doc.createDocumentFragment();

  let listIndex = 0;
  for (const block of blocks) {
    if (block.type === "numberedListItem") {
      listIndex++;
    } else {
      listIndex = 0;
    }
    const blockDOM = serializeBlock(
      editor,
      block,
      serializer,
      listIndex,
      options,
    );
    fragment.appendChild(blockDOM);
  }

  return fragment;
}

export const serializeBlocksInternalHTML = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blocks: PartialBlock<BSchema, I, S>[],
  serializer: DOMSerializer,
  options?: { document?: Document },
) => {
  const BG_NODE = editor.pmSchema.nodes["blockGroup"];

  const bg = BG_NODE.spec!.toDOM!(BG_NODE.create({})) as {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };

  const fragment = serializeBlocks(editor, blocks, serializer, options);

  bg.contentDOM?.appendChild(fragment);

  return bg.dom;
};
