import { Mark, Node, Slice } from "@tiptap/pm/model";

import UniqueID from "../../extensions/UniqueID/UniqueID.js";
import type {
  BlockSchema,
  CustomInlineContentConfig,
  CustomInlineContentFromConfig,
  InlineContent,
  InlineContentFromConfig,
  InlineContentSchema,
  StyleSchema,
  Styles,
  TableContent,
} from "../../schema/index.js";
import {
  getBlockInfoFromResolvedPos,
  getBlockInfoWithManualOffset,
} from "../getBlockInfoFromPos.js";

import { EditorState, Transaction } from "prosemirror-state";
import { ReplaceAroundStep, ReplaceStep } from "prosemirror-transform";
import type { Block } from "../../blocks/defaultBlocks.js";
import {
  isLinkInlineContent,
  isStyledTextInlineContent,
} from "../../schema/inlineContent/types.js";
import { UnreachableCaseError } from "../../util/typescript.js";

/**
 * Converts an internal (prosemirror) table node contentto a BlockNote Tablecontent
 */
export function contentNodeToTableContent<
  I extends InlineContentSchema,
  S extends StyleSchema
>(contentNode: Node, inlineContentSchema: I, styleSchema: S) {
  const ret: TableContent<I, S> = {
    type: "tableContent",
    columnWidths: [],
    rows: [],
  };

  contentNode.content.forEach((rowNode, _offset, index) => {
    const row: TableContent<I, S>["rows"][0] = {
      cells: [],
    };

    if (index === 0) {
      rowNode.content.forEach((cellNode) => {
        // The colwidth array should have multiple values when the colspan of a
        // cell is greater than 1. However, this is not yet implemented so we
        // can always assume a length of 1.
        ret.columnWidths.push(cellNode.attrs.colwidth?.[0] || undefined);
      });
    }

    rowNode.content.forEach((cellNode) => {
      row.cells.push(
        cellNode.firstChild
          ? contentNodeToInlineContent(
              cellNode.firstChild,
              inlineContentSchema,
              styleSchema
            )
          : []
      );
    });

    ret.rows.push(row);
  });

  return ret;
}

/**
 * Converts an internal (prosemirror) content node to a BlockNote InlineContent array.
 */
export function contentNodeToInlineContent<
  I extends InlineContentSchema,
  S extends StyleSchema
>(contentNode: Node, inlineContentSchema: I, styleSchema: S) {
  const content: InlineContent<any, S>[] = [];
  let currentContent: InlineContent<any, S> | undefined = undefined;

  // Most of the logic below is for handling links because in ProseMirror links are marks
  // while in BlockNote links are a type of inline content
  contentNode.content.forEach((node) => {
    // hardBreak nodes do not have an InlineContent equivalent, instead we
    // add a newline to the previous node.
    if (node.type.name === "hardBreak") {
      if (currentContent) {
        // Current content exists.
        if (isStyledTextInlineContent(currentContent)) {
          // Current content is text.
          currentContent.text += "\n";
        } else if (isLinkInlineContent(currentContent)) {
          // Current content is a link.
          currentContent.content[currentContent.content.length - 1].text +=
            "\n";
        } else {
          throw new Error("unexpected");
        }
      } else {
        // Current content does not exist.
        currentContent = {
          type: "text",
          text: "\n",
          styles: {},
        };
      }

      return;
    }

    if (
      node.type.name !== "link" &&
      node.type.name !== "text" &&
      inlineContentSchema[node.type.name]
    ) {
      if (currentContent) {
        content.push(currentContent);
        currentContent = undefined;
      }

      content.push(
        nodeToCustomInlineContent(node, inlineContentSchema, styleSchema)
      );

      return;
    }

    const styles: Styles<S> = {};
    let linkMark: Mark | undefined;

    for (const mark of node.marks) {
      if (mark.type.name === "link") {
        linkMark = mark;
      } else {
        const config = styleSchema[mark.type.name];
        if (!config) {
          throw new Error(`style ${mark.type.name} not found in styleSchema`);
        }
        if (config.propSchema === "boolean") {
          (styles as any)[config.type] = true;
        } else if (config.propSchema === "string") {
          (styles as any)[config.type] = mark.attrs.stringValue;
        } else {
          throw new UnreachableCaseError(config.propSchema);
        }
      }
    }

    // Parsing links and text.
    // Current content exists.
    if (currentContent) {
      // Current content is text.
      if (isStyledTextInlineContent(currentContent)) {
        if (!linkMark) {
          // Node is text (same type as current content).
          if (
            JSON.stringify(currentContent.styles) === JSON.stringify(styles)
          ) {
            // Styles are the same.
            currentContent.text += node.textContent;
          } else {
            // Styles are different.
            content.push(currentContent);
            currentContent = {
              type: "text",
              text: node.textContent,
              styles,
            };
          }
        } else {
          // Node is a link (different type to current content).
          content.push(currentContent);
          currentContent = {
            type: "link",
            href: linkMark.attrs.href,
            content: [
              {
                type: "text",
                text: node.textContent,
                styles,
              },
            ],
          };
        }
      } else if (isLinkInlineContent(currentContent)) {
        // Current content is a link.
        if (linkMark) {
          // Node is a link (same type as current content).
          // Link URLs are the same.
          if (currentContent.href === linkMark.attrs.href) {
            // Styles are the same.
            if (
              JSON.stringify(
                currentContent.content[currentContent.content.length - 1].styles
              ) === JSON.stringify(styles)
            ) {
              currentContent.content[currentContent.content.length - 1].text +=
                node.textContent;
            } else {
              // Styles are different.
              currentContent.content.push({
                type: "text",
                text: node.textContent,
                styles,
              });
            }
          } else {
            // Link URLs are different.
            content.push(currentContent);
            currentContent = {
              type: "link",
              href: linkMark.attrs.href,
              content: [
                {
                  type: "text",
                  text: node.textContent,
                  styles,
                },
              ],
            };
          }
        } else {
          // Node is text (different type to current content).
          content.push(currentContent);
          currentContent = {
            type: "text",
            text: node.textContent,
            styles,
          };
        }
      } else {
        // TODO
      }
    }
    // Current content does not exist.
    else {
      // Node is text.
      if (!linkMark) {
        currentContent = {
          type: "text",
          text: node.textContent,
          styles,
        };
      }
      // Node is a link.
      else {
        currentContent = {
          type: "link",
          href: linkMark.attrs.href,
          content: [
            {
              type: "text",
              text: node.textContent,
              styles,
            },
          ],
        };
      }
    }
  });

  if (currentContent) {
    content.push(currentContent);
  }

  return content as InlineContent<I, S>[];
}

export function nodeToCustomInlineContent<
  I extends InlineContentSchema,
  S extends StyleSchema
>(node: Node, inlineContentSchema: I, styleSchema: S): InlineContent<I, S> {
  if (node.type.name === "text" || node.type.name === "link") {
    throw new Error("unexpected");
  }
  const props: any = {};
  const icConfig = inlineContentSchema[
    node.type.name
  ] as CustomInlineContentConfig;
  for (const [attr, value] of Object.entries(node.attrs)) {
    if (!icConfig) {
      throw Error("ic node is of an unrecognized type: " + node.type.name);
    }

    const propSchema = icConfig.propSchema;

    if (attr in propSchema) {
      props[attr] = value;
    }
  }

  let content: CustomInlineContentFromConfig<any, any>["content"];

  if (icConfig.content === "styled") {
    content = contentNodeToInlineContent(
      node,
      inlineContentSchema,
      styleSchema
    ) as any; // TODO: is this safe? could we have Links here that are undesired?
  } else {
    content = undefined;
  }

  const ic = {
    type: node.type.name,
    props,
    content,
  } as InlineContentFromConfig<I[keyof I], S>;
  return ic;
}

/**
 * Convert a Prosemirror node to a BlockNote block.
 *
 * TODO: test changes
 */
export function nodeToBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  node: Node,
  blockSchema: BSchema,
  inlineContentSchema: I,
  styleSchema: S,
  blockCache?: WeakMap<Node, Block<BSchema, I, S>>
): Block<BSchema, I, S> {
  if (!node.type.isInGroup("bnBlock")) {
    throw Error(
      "Node must be in bnBlock group, but is of type" + node.type.name
    );
  }

  const cachedBlock = blockCache?.get(node);

  if (cachedBlock) {
    return cachedBlock;
  }

  const blockInfo = getBlockInfoWithManualOffset(node, 0);

  let id = blockInfo.bnBlock.node.attrs.id;

  // Only used for blocks converted from other formats.
  if (id === null) {
    id = UniqueID.options.generateID();
  }

  const blockSpec = blockSchema[blockInfo.blockNoteType];

  if (!blockSpec) {
    throw Error("Block is of an unrecognized type: " + blockInfo.blockNoteType);
  }

  const props: any = {};
  for (const [attr, value] of Object.entries({
    ...node.attrs,
    ...(blockInfo.isBlockContainer ? blockInfo.blockContent.node.attrs : {}),
  })) {
    const propSchema = blockSpec.propSchema;

    if (attr in propSchema) {
      props[attr] = value;
    }
  }

  const blockConfig = blockSchema[blockInfo.blockNoteType];

  const children: Block<BSchema, I, S>[] = [];
  blockInfo.childContainer?.node.forEach((child) => {
    children.push(
      nodeToBlock(
        child,
        blockSchema,
        inlineContentSchema,
        styleSchema,
        blockCache
      )
    );
  });

  let content: Block<any, any, any>["content"];

  if (blockConfig.content === "inline") {
    if (!blockInfo.isBlockContainer) {
      throw new Error("impossible");
    }
    content = contentNodeToInlineContent(
      blockInfo.blockContent.node,
      inlineContentSchema,
      styleSchema
    );
  } else if (blockConfig.content === "table") {
    if (!blockInfo.isBlockContainer) {
      throw new Error("impossible");
    }
    content = contentNodeToTableContent(
      blockInfo.blockContent.node,
      inlineContentSchema,
      styleSchema
    );
  } else if (blockConfig.content === "none") {
    content = undefined;
  } else {
    throw new UnreachableCaseError(blockConfig.content);
  }

  const block = {
    id,
    type: blockConfig.type,
    props,
    content,
    children,
  } as Block<BSchema, I, S>;

  blockCache?.set(node, block);

  return block;
}

export type SlicedBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  block: Block<BSchema, I, S> & {
    children: SlicedBlock<BSchema, I, S>[];
  };
  contentCutAtStart: boolean;
  contentCutAtEnd: boolean;
};

export function selectionToInsertionEnd(tr: Transaction, startLen: number) {
  const last = tr.steps.length - 1;

  if (last < startLen) {
    return;
  }

  const step = tr.steps[last];

  if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) {
    return;
  }

  const map = tr.mapping.maps[last];
  let end = 0;

  map.forEach((_from, _to, _newFrom, newTo) => {
    if (end === 0) {
      end = newTo;
    }
  });

  return end;
}

export function withSelectionMarkers<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  state: EditorState,
  from: number,
  to: number,
  blockSchema: BSchema,
  inlineContentSchema: I,
  styleSchema: S,
  blockCache?: WeakMap<Node, Block<BSchema, I, S>>
) {
  if (from >= to) {
    throw new Error("from must be less than to");
  }
  let tr = state.tr.insertText("!$]", to);
  let newEnd = selectionToInsertionEnd(tr, tr.steps.length - 1)!;

  tr = tr.insertText("[$!", from);

  newEnd = tr.mapping.maps[tr.mapping.maps.length - 1].map(newEnd);

  if (!tr.docChanged || tr.steps.length !== 2) {
    throw new Error(
      "tr.docChanged is false or insertText was not applied. Was a valid textselection passed?"
    );
  }

  return getBlocksBetween(
    from,
    newEnd,
    tr.doc,
    blockSchema,
    inlineContentSchema,
    styleSchema,
    blockCache
  );
}

/**
 * Returns all blocks between two positions in a document, but without automatically including parent blocks
 */
function getBlocksBetween<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  start: number,
  end: number,
  doc: Node,
  blockSchema: BSchema,
  inlineContentSchema: I,
  styleSchema: S,
  blockCache?: WeakMap<Node, Block<BSchema, I, S>>
) {
  const startNode = getBlockInfoFromResolvedPos(doc.resolve(start));
  const endNode = getBlockInfoFromResolvedPos(doc.resolve(end));

  const slice = doc.slice(
    startNode.bnBlock.beforePos,
    endNode.bnBlock.afterPos,
    true
  );

  const bnSelection = prosemirrorSliceToSlicedBlocks(
    slice,
    blockSchema,
    inlineContentSchema,
    styleSchema,
    blockCache
  );

  // we don't care about the slice metadata, because our slice is based on complete blocks, the
  return withoutSliceMetadata(bnSelection.blocks);
}

export function withoutSliceMetadata<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(blocks: SlicedBlock<BSchema, I, S>[]): Block<BSchema, I, S>[] {
  return blocks.map((block) => {
    return {
      ...block.block,
      children: withoutSliceMetadata(block.block.children),
    };
  });
}

/**
 *
 * Parse a Prosemirror Slice into a BlockNote selection. The prosemirror schema looks like this:
 *
 * <blockGroup>
 *   <blockContainer> (main content of block)
 *       <p, heading, etc.>
 *   <blockGroup> (only if blocks has children)
 *     <blockContainer> (child block)
 *       <p, heading, etc.>
 *     </blockContainer>
 *    <blockContainer> (child block 2)
 *       <p, heading, etc.>
 *     </blockContainer>
 *   </blockContainer>
 *  </blockGroup>
 * </blockGroup>
 *
 * Examples,
 *
 * for slice:
 *
 * {"content":[{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"1","textColor":"yellow","backgroundColor":"blue"},"content":[{"type":"heading","attrs":{"textAlignment":"right","level":2},"content":[{"type":"text","marks":[{"type":"bold"},{"type":"underline"}],"text":"ding "},{"type":"text","marks":[{"type":"italic"},{"type":"strike"}],"text":"2"}]},{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"2","textColor":"default","backgroundColor":"red"},"content":[{"type":"paragraph","attrs":{"textAlignment":"left"},"content":[{"type":"text","text":"Par"}]}]}]}]}]}],"openStart":3,"openEnd":5}
 *
 * should return:
 *
 * [
 *   {
 *     block: {
 *       nodeToBlock(first blockContainer node),
 *       children: [
 *         {
 *           block: nodeToBlock(second blockContainer node),
 *           contentCutAtEnd: true,
 *           childrenCutAtEnd: false,
 *         },
 *       ],
 *     },
 *      contentCutAtStart: true,
 *     contentCutAtEnd: false,
 *     childrenCutAtEnd: true,
 *   },
 * ]
 */
export function prosemirrorSliceToSlicedBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  slice: Slice,
  blockSchema: BSchema,
  inlineContentSchema: I,
  styleSchema: S,
  blockCache?: WeakMap<Node, Block<BSchema, I, S>>
): {
  blocks: SlicedBlock<BSchema, I, S>[];
} {
  // console.log(JSON.stringify(slice.toJSON()));
  function processNode(
    node: Node,
    openStart: number,
    openEnd: number
  ): SlicedBlock<BSchema, I, S>[] {
    if (node.type.name !== "blockGroup") {
      throw new Error("unexpected");
    }
    const blocks: SlicedBlock<BSchema, I, S>[] = [];

    node.forEach((blockContainer, _offset, index) => {
      if (blockContainer.type.name !== "blockContainer") {
        throw new Error("unexpected");
      }
      if (blockContainer.childCount === 0) {
        return;
      }
      if (blockContainer.childCount === 0 || blockContainer.childCount > 2) {
        throw new Error(
          "unexpected, blockContainer.childCount: " + blockContainer.childCount
        );
      }

      const isFirstBlock = index === 0;
      const isLastBlock = index === node.childCount - 1;

      if (blockContainer.firstChild!.type.name === "blockGroup") {
        // this is the parent where a selection starts within one of its children,
        // e.g.:
        // A
        // ├── B
        // selection starts within B, then this blockContainer is A, but we don't care about A
        // so let's descend into B and continue processing
        if (!isFirstBlock) {
          throw new Error("unexpected");
        }
        blocks.push(
          ...processNode(
            blockContainer.firstChild!,
            Math.max(0, openStart - 1),
            isLastBlock ? Math.max(0, openEnd - 1) : 0
          )
        );
        return;
      }

      const block = nodeToBlock(
        blockContainer,
        blockSchema,
        inlineContentSchema,
        styleSchema,
        blockCache
      );
      const childGroup =
        blockContainer.childCount > 1 ? blockContainer.child(1) : undefined;

      let childBlocks: SlicedBlock<BSchema, I, S>[] = [];
      if (childGroup) {
        childBlocks = processNode(
          childGroup,
          0, // TODO: can this be anything other than 0?
          isLastBlock ? Math.max(0, openEnd - 1) : 0
        );
      }

      blocks.push({
        block: {
          ...(block as any),
          children: childBlocks,
        },
        contentCutAtStart: openStart > 1 && isFirstBlock,
        contentCutAtEnd: !!(openEnd > 1 && isLastBlock && !childGroup),
      });
    });

    return blocks;
  }

  if (slice.content.childCount === 0) {
    return {
      blocks: [],
    };
  }

  if (slice.content.childCount !== 1) {
    throw new Error(
      "slice must be a single block, did you forget includeParents=true?"
    );
  }

  return {
    blocks: processNode(
      slice.content.firstChild!,
      Math.max(slice.openStart - 1, 0),
      Math.max(slice.openEnd - 1, 0)
    ),
  };
}
