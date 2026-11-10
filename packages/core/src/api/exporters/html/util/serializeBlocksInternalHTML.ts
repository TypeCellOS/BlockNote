import { DOMSerializer, Fragment, Node } from "prosemirror-model";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { isLayoutNode } from "../../../../schema/blocks/children.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import {
  inlineContentToNodes,
  tableContentToNodes,
} from "../../../nodeConversions/blockToNode.js";

import { nodeToCustomInlineContent } from "../../../nodeConversions/nodeToBlock.js";
import { setBlockColorAttributes } from "../../../../pm-nodes/BlockContainer.js";
import {
  markFrameSlot,
  renderFrameDOM,
} from "../../../../schema/blocks/frame.js";
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
      node.type.name !== "text" &&
      editor.schema.inlineContentSchema[node.type.name]
    ) {
      const inlineContentImplementation =
        editor.schema.inlineContentSpecs[node.type.name].implementation;

      if (inlineContentImplementation) {
        // Convert the node to inline content format
        const inlineContent = nodeToCustomInlineContent(
          node,
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema,
        );

        // Use the custom toExternalHTML method
        const output = inlineContentImplementation.render.call(
          {
            renderType: "dom",
            props: undefined,
          },
          inlineContent as any,
          () => {
            // No-op
          },
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
    } else if (node.type.name === "text") {
      // We serialize text nodes manually as we need to serialize the styles/
      // marks using `styleSpec.implementation.render`. When left up to
      // ProseMirror, it'll use `toDOM` which is incorrect.
      let dom: globalThis.Node | Text = document.createTextNode(
        node.textContent,
      );
      // Reverse the order of marks to maintain the correct priority.
      for (const mark of node.marks.toReversed()) {
        if (mark.type.name in editor.schema.styleSpecs) {
          const newDom = editor.schema.styleSpecs[
            mark.type.name
          ].implementation.render(mark.attrs["stringValue"], editor);
          newDom.contentDOM!.appendChild(dom);
          dom = newDom.dom;
        } else {
          const domOutputSpec = mark.type.spec.toDOM!(mark, true);
          const newDom = DOMSerializer.renderSpec(document, domOutputSpec);
          newDom.contentDOM!.appendChild(dom);
          dom = newDom.dom;
        }
      }

      fragment.appendChild(dom);
    } else {
      // Fall back to default serialization for this node
      const nodeFragment = serializer.serializeFragment(
        Fragment.from([node]),
        options,
      );
      fragment.appendChild(nodeFragment);
    }
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
  const children = block.children || [];

  const impl = editor.blockImplementations[block.type as any].implementation;
  const fullBlock = { ...block, props, children } as any;

  if (isLayoutNode(editor.pmSchema.nodes[block.type as any])) {
    // A layout block is its frame. `renderFrameDOM` stamps the frame's root with
    // the block's attributes and marks the slot, which holds the children, so
    // the round-trip parse rule reads only the slot and not the chrome around
    // it.
    const frame = renderFrameDOM(editor, fullBlock);
    if (!frame) {
      throw new Error(
        `Layout block "${block.type}" drew no frame. This is a bug in BlockNote.`,
      );
    }
    if (children.length > 0) {
      frame.slot.append(serializeBlocks(editor, children, serializer, options));
    }
    return frame.dom;
  }

  // Every block but a layout block declares `render` (`validateRenderHooks`).
  if (!impl.render) {
    throw new Error(
      `Block "${block.type}" has no \`render\`. This is a bug in BlockNote.`,
    );
  }
  const ret = impl.render.call(
    {
      renderType: "dom",
      props: undefined,
    },
    fullBlock,
    editor as any,
  );

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
  if (bc.contentDOM) {
    setBlockColorAttributes(bc.contentDOM, props);
  }

  // The block's content and children go into the blockContainer, or into the
  // slot of the frame around them. The DOM render context lets interactive
  // frames export without browser view state.
  let contentDOM = bc.contentDOM;
  const frame = renderFrameDOM(editor, fullBlock);
  if (frame) {
    // Marks where the block's content and children are, for the parser: the
    // rest of the frame is chrome, not document content.
    markFrameSlot(frame.slot);
    bc.contentDOM?.appendChild(frame.dom);
    contentDOM = frame.slot;
  }
  contentDOM?.appendChild(ret.dom);

  if (children.length > 0) {
    contentDOM?.appendChild(
      serializeBlocksInternalHTML(editor, children, serializer, options),
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

  for (const block of blocks) {
    const blockDOM = serializeBlock(editor, block, serializer, options);
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
