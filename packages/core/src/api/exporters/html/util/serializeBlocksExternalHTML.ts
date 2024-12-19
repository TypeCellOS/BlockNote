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
} from "../../../nodeConversions/blockToNode.js";

function addAttributesAndRemoveClasses(element: HTMLElement) {
  // Removes all BlockNote specific class names.
  const className =
    [...element.classList].filter(
      (className) => !className.startsWith("bn-")
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
  S extends StyleSchema
>(
  editor: BlockNoteEditor<any, I, S>,
  blockContent: PartialBlock<BSchema, I, S>["content"],
  serializer: DOMSerializer,
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

  if (dom.nodeType === 1 /* Node.ELEMENT_NODE */) {
    addAttributesAndRemoveClasses(dom as HTMLElement);
  }

  return dom;
}

/**
 * TODO: there's still quite some logic that handles getting and filtering properties,
 * we should make sure the `toExternalHTML` methods of default blocks actually handle this,
 * instead of the serializer.
 */
function serializeBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  fragment: DocumentFragment,
  editor: BlockNoteEditor<BSchema, I, S>,
  block: PartialBlock<BSchema, I, S>,
  serializer: DOMSerializer,
  orderedListItemBlockTypes: Set<string>,
  unorderedListItemBlockTypes: Set<string>,
  options?: { document?: Document }
) {
  const doc = options?.document ?? document;
  const BC_NODE = editor.pmSchema.nodes["blockContainer"];

  let props = block.props;
  // set default props in case we were passed a partial block
  if (!block.props) {
    props = {};
    for (const [name, spec] of Object.entries(
      editor.schema.blockSchema[block.type as any].propSchema
    )) {
      if (spec.default !== undefined) {
        (props as any)[name] = spec.default;
      }
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

  // the container node is just used as a workaround to get some block-level attributes.
  // we should change toExternalHTML so that this is not necessary
  const attrs = [...bc.dom.attributes];

  const ret = editor.blockImplementations[
    block.type as any
  ].implementation.toExternalHTML({ ...block, props } as any, editor as any);

  const elementFragment = doc.createDocumentFragment();
  if (ret.dom.classList.contains("bn-block-content")) {
    const blockContentDataAttributes = [...attrs, ...ret.dom.attributes].filter(
      (attr) =>
        attr.name.startsWith("data") &&
        attr.name !== "data-content-type" &&
        attr.name !== "data-file-block" &&
        attr.name !== "data-node-view-wrapper" &&
        attr.name !== "data-node-type" &&
        attr.name !== "data-id" &&
        attr.name !== "data-index" &&
        attr.name !== "data-editable"
    );

    // ret.dom = ret.dom.firstChild! as any;
    for (const attr of blockContentDataAttributes) {
      (ret.dom.firstChild! as HTMLElement).setAttribute(attr.name, attr.value);
    }

    addAttributesAndRemoveClasses(ret.dom.firstChild! as HTMLElement);
    elementFragment.append(...ret.dom.childNodes);
  } else {
    elementFragment.append(ret.dom);
  }

  if (ret.contentDOM && block.content) {
    const ic = serializeInlineContentExternalHTML(
      editor,
      block.content as any, // TODO
      serializer,
      options
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

      if (listType === "OL" && props?.start && props?.start !== 1) {
        list.setAttribute("start", props.start + "");
      }
      fragment.append(list);
    }
    const li = doc.createElement("li");
    li.append(elementFragment);
    fragment.lastChild!.appendChild(li);
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
      options
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
  S extends StyleSchema
>(
  fragment: DocumentFragment,
  editor: BlockNoteEditor<BSchema, I, S>,
  blocks: PartialBlock<BSchema, I, S>[],
  serializer: DOMSerializer,
  orderedListItemBlockTypes: Set<string>,
  unorderedListItemBlockTypes: Set<string>,
  options?: { document?: Document }
) => {
  for (const block of blocks) {
    serializeBlock(
      fragment,
      editor,
      block,
      serializer,
      orderedListItemBlockTypes,
      unorderedListItemBlockTypes,
      options
    );
  }
};

export const serializeBlocksExternalHTML = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  blocks: PartialBlock<BSchema, I, S>[],
  serializer: DOMSerializer,
  orderedListItemBlockTypes: Set<string>,
  unorderedListItemBlockTypes: Set<string>,
  options?: { document?: Document }
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
    options
  );
  return fragment;
};
