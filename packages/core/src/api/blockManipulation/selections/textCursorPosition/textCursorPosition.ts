import { Node } from "prosemirror-model";

import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { TextCursorPosition } from "../../../../editor/cursorPositionTypes.js";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import {
  getBlockInfo,
  getBlockInfoFromSelection,
} from "../../../getBlockInfoFromPos.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";

export function getTextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>): TextCursorPosition<BSchema, I, S> {
  const { bnBlock } = getBlockInfoFromSelection(editor._tiptapEditor.state);

  const resolvedPos = editor._tiptapEditor.state.doc.resolve(bnBlock.beforePos);
  // Gets previous blockContainer node at the same nesting level, if the current node isn't the first child.
  const prevNode = resolvedPos.nodeBefore;

  // Gets next blockContainer node at the same nesting level, if the current node isn't the last child.
  const nextNode = editor._tiptapEditor.state.doc.resolve(
    bnBlock.afterPos
  ).nodeAfter;

  // Gets parent blockContainer node, if the current node is nested.
  let parentNode: Node | undefined = undefined;
  if (resolvedPos.depth > 1) {
    // for nodes nested in bnBlocks
    parentNode = resolvedPos.node();
    if (!parentNode.type.isInGroup("bnBlock")) {
      // for blockGroups, we need to go one level up
      parentNode = resolvedPos.node(resolvedPos.depth - 1);
    }
  }

  return {
    block: nodeToBlock(
      bnBlock.node,
      editor.schema.blockSchema,
      editor.schema.inlineContentSchema,
      editor.schema.styleSchema,
      editor.blockCache
    ),
    prevBlock:
      prevNode === null
        ? undefined
        : nodeToBlock(
            prevNode,
            editor.schema.blockSchema,
            editor.schema.inlineContentSchema,
            editor.schema.styleSchema,
            editor.blockCache
          ),
    nextBlock:
      nextNode === null
        ? undefined
        : nodeToBlock(
            nextNode,
            editor.schema.blockSchema,
            editor.schema.inlineContentSchema,
            editor.schema.styleSchema,
            editor.blockCache
          ),
    parentBlock:
      parentNode === undefined
        ? undefined
        : nodeToBlock(
            parentNode,
            editor.schema.blockSchema,
            editor.schema.inlineContentSchema,
            editor.schema.styleSchema,
            editor.blockCache
          ),
  };
}

export function setTextCursorPosition<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  targetBlock: BlockIdentifier,
  placement: "start" | "end" = "start"
) {
  const id = typeof targetBlock === "string" ? targetBlock : targetBlock.id;

  const posInfo = getNodeById(id, editor._tiptapEditor.state.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  const info = getBlockInfo(posInfo);

  const contentType: "none" | "inline" | "table" =
    editor.schema.blockSchema[info.blockNoteType]!.content;

  if (info.isBlockContainer) {
    const blockContent = info.blockContent;
    if (contentType === "none") {
      editor._tiptapEditor.commands.setNodeSelection(blockContent.beforePos);
      return;
    }

    if (contentType === "inline") {
      if (placement === "start") {
        editor._tiptapEditor.commands.setTextSelection(
          blockContent.beforePos + 1
        );
      } else {
        editor._tiptapEditor.commands.setTextSelection(
          blockContent.afterPos - 1
        );
      }
    } else if (contentType === "table") {
      if (placement === "start") {
        // Need to offset the position as we have to get through the `tableRow`
        // and `tableCell` nodes to get to the `tableParagraph` node we want to
        // set the selection in.
        editor._tiptapEditor.commands.setTextSelection(
          blockContent.beforePos + 4
        );
      } else {
        editor._tiptapEditor.commands.setTextSelection(
          blockContent.afterPos - 4
        );
      }
    } else {
      throw new UnreachableCaseError(contentType);
    }
  } else {
    const child =
      placement === "start"
        ? info.childContainer.node.firstChild!
        : info.childContainer.node.lastChild!;

    setTextCursorPosition(editor, child.attrs.id, placement);
  }
}
