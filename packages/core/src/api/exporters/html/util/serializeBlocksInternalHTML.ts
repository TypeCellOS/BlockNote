import { DOMSerializer, Fragment, Node } from "prosemirror-model";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  isContainerType,
  StyleSchema,
} from "../../../../schema/index.js";
import { fillContainerAttributes } from "../../../../schema/blocks/containerAttributes.js";
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

/**
 * Appends the two region elements a content-bearing container's generated
 * `__content` / `__children` nodes render, so that internal HTML matches what
 * the editor puts in the DOM (and what the generated parse rules match).
 */
function createContainerRegions(
  contentDOM: HTMLElement,
  blockType: string,
  options?: { document?: Document },
): { content: HTMLElement; children: HTMLElement } {
  const doc = options?.document ?? document;

  const content = doc.createElement("div");
  content.className = "bn-inline-content";
  content.setAttribute("data-content-type", blockType);

  const children = doc.createElement("div");
  children.setAttribute("data-children-of", blockType);

  contentDOM.append(content, children);

  return { content, children };
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
  const ret = impl.render.call(
    {
      renderType: "dom",
      props: undefined,
    },
    { ...block, props, children } as any,
    editor as any,
  );

  // Asked of the block config rather than of its ProseMirror node. A
  // container that has its own content compiles to an outer node holding a
  // separate children node, so the outer node is not itself a
  // `childContainer`, but the block is still a container and still owns its
  // outer DOM.
  const blockConfig = editor.schema.blockSchema[block.type as any];
  const isContainer = isContainerType(blockConfig);

  // A container with its own content holds two generated nodes, `__content`
  // and `__children`, and so renders two region elements inside its content
  // host. Without them only the first child parses back inside the
  // container. ProseMirror has to invent the `__children` wrapping while
  // parsing, and `blockContainer`'s `blockOuter` skip rule re-syncs the
  // parse context to the container afterwards, closing that invented
  // wrapping again.
  const regions =
    isContainer && ret.contentDOM && blockConfig.content !== "none"
      ? createContainerRegions(ret.contentDOM, block.type!, options)
      : undefined;

  const contentHost = regions?.content ?? ret.contentDOM;

  if (contentHost && block.content) {
    const ic = serializeInlineContentInternalHTML(
      editor,
      block.content as any, // TODO
      serializer,
      block.type,
      options,
    );
    contentHost.appendChild(ic);
  }

  if (isContainer) {
    // Container blocks own their outer DOM. Internal HTML must round-trip
    // losslessly, so make sure the attributes the generated parse rules read
    // (the type marker and non-default props as `data-*`) are present even
    // when the block's render didn't add them. Author-set attributes win.
    fillContainerAttributes(
      ret.dom as HTMLElement,
      block.type!,
      props,
      blockConfig.propSchema,
    );

    // A pure container holds its children directly in its `contentDOM`; one
    // with its own content puts them in the children region, after the
    // content region, matching the order the document model imposes.
    const childrenHost = regions?.children ?? ret.contentDOM;
    // Mark where the children live so the container's round-trip parse rule
    // can scope itself to this element (`contentElement` in `getParseRules`).
    // A render is free to put non-content UI text elsewhere in its DOM
    // (button labels, captions, ...), and without the marker that text would
    // parse back as document content. Content-bearing containers get the
    // marker from `createContainerRegions`.
    if (!regions && ret.contentDOM) {
      ret.contentDOM.setAttribute("data-children-of", block.type!);
    }
    if (block.children && block.children.length > 0) {
      const fragment = serializeBlocks(
        editor,
        block.children,
        serializer,
        options,
      );

      childrenHost?.append(fragment);
    }
    return ret.dom;
  }

  // Legacy path for `@blocknote/xl-multi-column`'s hand-written PM nodes,
  // which sit in the `bnBlock` group but have no `children` config. They own
  // their outer DOM and hold their children directly in their `contentDOM`.
  // Removed once multi-column is migrated onto the container API.
  const pmType = editor.pmSchema.nodes[block.type!];
  if (pmType?.isInGroup("bnBlock")) {
    if (block.children && block.children.length > 0) {
      ret.contentDOM?.append(
        serializeBlocks(editor, block.children, serializer, options),
      );
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
