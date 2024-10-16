import { DOMSerializer, Fragment } from "prosemirror-model";

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
} from "../../../nodeConversions/nodeConversions.js";

export function serializeInlineContent<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<any, I, S>,
  blockContent: PartialBlock<BSchema, I, S>["content"],
  serializer: DOMSerializer,
  _toExternalHTML: boolean, // TODO, externalHTML for IC
  options?: { document?: Document }
) {
  let nodes: any;

  // TODO: reuse function from nodeconversions?
  if (!blockContent) {
    throw new Error("blockContent is required");
  } else if (typeof blockContent === "string") {
    nodes = inlineContentToNodes(
      [blockContent],
      editor.pmSchema,
      editor.schema.styleSchema
    );
  } else if (Array.isArray(blockContent)) {
    nodes = inlineContentToNodes(
      blockContent,
      editor.pmSchema,
      editor.schema.styleSchema
    );
  } else if (blockContent.type === "tableContent") {
    nodes = tableContentToNodes(
      blockContent,
      editor.pmSchema,
      editor.schema.styleSchema
    );
  } else {
    throw new UnreachableCaseError(blockContent.type);
  }

  // We call the prosemirror serializer here because it handles Marks and Inline Content nodes nicely.
  // If we'd want to support custom serialization or externalHTML for Inline Content, we'd have to implement
  // a custom serializer here.
  const dom = serializer.serializeFragment(Fragment.from(nodes), options);

  return dom;
}

function serializeBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  block: PartialBlock<BSchema, I, S>,
  serializer: DOMSerializer,
  toExternalHTML: boolean,
  options?: { document?: Document }
) {
  const BC_NODE = editor.pmSchema.nodes["blockContainer"];

  let props = block.props;
  // set default props in case we were passed a partial block
  if (!block.props) {
    props = {};
    for (const [name, spec] of Object.entries(
      editor.schema.blockSchema[block.type as any].propSchema
    )) {
      (props as any)[name] = spec.default;
    }
  }

  const bc = BC_NODE.spec?.toDOM?.(
    BC_NODE.create({
      id: block.id,
      ...props,
    })
  ) as {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };

  const impl = editor.blockImplementations[block.type as any].implementation;
  const ret = toExternalHTML
    ? impl.toExternalHTML({ ...block, props } as any, editor as any)
    : impl.toInternalHTML({ ...block, props } as any, editor as any);

  if (ret.contentDOM && block.content) {
    const ic = serializeInlineContent(
      editor,
      block.content as any, // TODO
      serializer,
      toExternalHTML,
      options
    );
    ret.contentDOM.appendChild(ic);
  }

  bc.contentDOM?.appendChild(ret.dom);

  if (block.children && block.children.length > 0) {
    bc.contentDOM?.appendChild(
      serializeBlocks(
        editor,
        block.children,
        serializer,
        toExternalHTML,
        options
      )
    );
  }
  return bc.dom;
}

export const serializeBlocks = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blocks: PartialBlock<BSchema, I, S>[],
  serializer: DOMSerializer,
  toExternalHTML: boolean,
  options?: { document?: Document }
) => {
  const BG_NODE = editor.pmSchema.nodes["blockGroup"];

  const bg = BG_NODE.spec!.toDOM!(BG_NODE.create({})) as {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };

  for (const block of blocks) {
    const blockDOM = serializeBlock(
      editor,
      block,
      serializer,
      toExternalHTML,
      options
    );
    bg.contentDOM!.appendChild(blockDOM);
  }

  return bg.dom;
};
