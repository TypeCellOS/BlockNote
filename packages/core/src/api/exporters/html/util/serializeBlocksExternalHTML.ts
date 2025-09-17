import { DOMSerializer, Fragment, Node } from "prosemirror-model";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockImplementation,
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

function addAttributesAndRemoveClasses(element: HTMLElement) {
  // Removes all BlockNote specific class names.
  const className =
    Array.from(element.classList).filter(
      (className) => !className.startsWith("bn-"),
    ) || [];

  if (className.length > 0) {
    element.className = className.join(" ");
  } else {
    element.removeAttribute("class");
  }
}

export function serializeInlineContentExternalHTML<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<any, I, S>,
  blockContent: PartialBlock<BSchema, I, S>["content"],
  serializer: DOMSerializer,
  options?: { document?: Document },
) {
  let nodes: Node[];

  // TODO: reuse function from nodeconversions?
  if (!blockContent) {
    throw new Error("blockContent is required");
  } else if (typeof blockContent === "string") {
    nodes = inlineContentToNodes([blockContent], editor.pmSchema);
  } else if (Array.isArray(blockContent)) {
    nodes = inlineContentToNodes(blockContent, editor.pmSchema);
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

        // Use the custom toExternalHTML method or fallback to `render`
        const output = inlineContentImplementation.toExternalHTML
          ? inlineContentImplementation.toExternalHTML(
              inlineContent as any,
              editor as any,
            )
          : inlineContentImplementation.render.call(
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
          const newDom = (
            editor.schema.styleSpecs[mark.type.name].implementation
              .toExternalHTML ??
            editor.schema.styleSpecs[mark.type.name].implementation.render
          )(mark.attrs["stringValue"], editor);
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

  if (
    fragment.childNodes.length === 1 &&
    fragment.firstChild?.nodeType === 1 /* Node.ELEMENT_NODE */
  ) {
    addAttributesAndRemoveClasses(fragment.firstChild as HTMLElement);
  }

  return fragment;
}

/**
 * TODO: there's still quite some logic that handles getting and filtering properties,
 * we should make sure the `toExternalHTML` methods of default blocks actually handle this,
 * instead of the serializer.
 */
function serializeBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  fragment: DocumentFragment,
  editor: BlockNoteEditor<BSchema, I, S>,
  block: PartialBlock<BSchema, I, S>,
  serializer: DOMSerializer,
  orderedListItemBlockTypes: Set<string>,
  unorderedListItemBlockTypes: Set<string>,
  options?: { document?: Document },
) {
  const doc = options?.document ?? document;
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

  const bc = BC_NODE.spec?.toDOM?.(
    BC_NODE.create({
      id: block.id,
      ...props,
    }),
  ) as {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };

  // the container node is just used as a workaround to get some block-level attributes.
  // we should change toExternalHTML so that this is not necessary
  const attrs = Array.from(bc.dom.attributes);

  const blockImplementation = editor.blockImplementations[block.type as any]
    .implementation as BlockImplementation;
  const ret =
    blockImplementation.toExternalHTML?.call(
      {},
      { ...block, props } as any,
      editor as any,
    ) ||
    blockImplementation.render.call(
      {},
      { ...block, props } as any,
      editor as any,
    );

  const elementFragment = doc.createDocumentFragment();

  if ((ret.dom as HTMLElement).classList.contains("bn-block-content")) {
    const blockContentDataAttributes = [
      ...attrs,
      ...Array.from((ret.dom as HTMLElement).attributes),
    ].filter(
      (attr) =>
        attr.name.startsWith("data") &&
        attr.name !== "data-content-type" &&
        attr.name !== "data-file-block" &&
        attr.name !== "data-node-view-wrapper" &&
        attr.name !== "data-node-type" &&
        attr.name !== "data-id" &&
        attr.name !== "data-editable",
    );

    // ret.dom = ret.dom.firstChild! as any;
    for (const attr of blockContentDataAttributes) {
      (ret.dom.firstChild! as HTMLElement).setAttribute(attr.name, attr.value);
    }

    addAttributesAndRemoveClasses(ret.dom.firstChild! as HTMLElement);
    elementFragment.append(...Array.from(ret.dom.childNodes));
  } else {
    elementFragment.append(ret.dom);
  }

  if (ret.contentDOM && block.content) {
    const ic = serializeInlineContentExternalHTML(
      editor,
      block.content as any, // TODO
      serializer,
      options,
    );

    ret.contentDOM.appendChild(ic);
  }

  let listType = undefined;
  if (orderedListItemBlockTypes.has(block.type!)) {
    listType = "OL";
  } else if (unorderedListItemBlockTypes.has(block.type!)) {
    listType = "UL";
  }

  if (listType) {
    if (fragment.lastChild?.nodeName !== listType) {
      const list = doc.createElement(listType);

      if (
        listType === "OL" &&
        "start" in props &&
        props.start &&
        props?.start !== 1
      ) {
        list.setAttribute("start", props.start + "");
      }
      fragment.append(list);
    }
    fragment.lastChild!.appendChild(elementFragment);
  } else {
    fragment.append(elementFragment);
  }

  if (block.children && block.children.length > 0) {
    const childFragment = doc.createDocumentFragment();
    serializeBlocksToFragment(
      childFragment,
      editor,
      block.children,
      serializer,
      orderedListItemBlockTypes,
      unorderedListItemBlockTypes,
      options,
    );
    if (
      fragment.lastChild?.nodeName === "UL" ||
      fragment.lastChild?.nodeName === "OL"
    ) {
      // add nested lists to the last list item
      while (
        childFragment.firstChild?.nodeName === "UL" ||
        childFragment.firstChild?.nodeName === "OL"
      ) {
        fragment.lastChild!.lastChild!.appendChild(childFragment.firstChild!);
      }
    }

    if (editor.pmSchema.nodes[block.type as any].isInGroup("blockContent")) {
      // default "blockContainer" style blocks are flattened (no "nested block" support) for externalHTML, so append the child fragment to the outer fragment
      fragment.append(childFragment);
    } else {
      // for columns / column lists, do use nesting
      ret.contentDOM?.append(childFragment);
    }
  }
}

const serializeBlocksToFragment = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  fragment: DocumentFragment,
  editor: BlockNoteEditor<BSchema, I, S>,
  blocks: PartialBlock<BSchema, I, S>[],
  serializer: DOMSerializer,
  orderedListItemBlockTypes: Set<string>,
  unorderedListItemBlockTypes: Set<string>,
  options?: { document?: Document },
) => {
  for (const block of blocks) {
    serializeBlock(
      fragment,
      editor,
      block,
      serializer,
      orderedListItemBlockTypes,
      unorderedListItemBlockTypes,
      options,
    );
  }
};

export const serializeBlocksExternalHTML = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blocks: PartialBlock<BSchema, I, S>[],
  serializer: DOMSerializer,
  orderedListItemBlockTypes: Set<string>,
  unorderedListItemBlockTypes: Set<string>,
  options?: { document?: Document },
) => {
  const doc = options?.document ?? document;
  const fragment = doc.createDocumentFragment();

  serializeBlocksToFragment(
    fragment,
    editor,
    blocks,
    serializer,
    orderedListItemBlockTypes,
    unorderedListItemBlockTypes,
    options,
  );
  return fragment;
};
