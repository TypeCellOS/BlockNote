import { Fragment, Slice } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";

import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos.js";

export const splitBlockCommand =
  (posInBlock: number, keepType?: boolean, keepProps?: boolean) =>
  ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    const blockInfo = getBlockInfoFromPos(state.doc, posInBlock);
    if (blockInfo === undefined) {
      return false;
    }

    const { contentNode, contentType, startPos, endPos, depth } = blockInfo;

    const originalBlockContent = state.doc.cut(startPos + 1, posInBlock);
    const newBlockContent = state.doc.cut(posInBlock, endPos - 1);

    const newBlock = state.schema.nodes["blockContainer"].createAndFill()!;

    const newBlockInsertionPos = endPos + 1;
    const newBlockContentPos = newBlockInsertionPos + 2;

    if (dispatch) {
      // Creates a new block. Since the schema requires it to have a content node, a paragraph node is created
      // automatically, spanning newBlockContentPos to newBlockContentPos + 1.
      state.tr.insert(newBlockInsertionPos, newBlock);

      // Replaces the content of the newly created block's content node. Doesn't replace the whole content node so
      // its type doesn't change.
      state.tr.replace(
        newBlockContentPos,
        newBlockContentPos + 1,
        newBlockContent.content.size > 0
          ? new Slice(Fragment.from(newBlockContent), depth + 2, depth + 2)
          : undefined
      );

      // Changes the type of the content node. The range doesn't matter as long as both from and to positions are
      // within the content node.
      if (keepType) {
        state.tr.setBlockType(
          newBlockContentPos,
          newBlockContentPos,
          state.schema.node(contentType).type,
          keepProps ? contentNode.attrs : undefined
        );
      }

      // Sets the selection to the start of the new block's content node.
      state.tr.setSelection(
        new TextSelection(state.doc.resolve(newBlockContentPos))
      );

      // Replaces the content of the original block's content node. Doesn't replace the whole content node so its
      // type doesn't change.
      state.tr.replace(
        startPos + 1,
        endPos - 1,
        originalBlockContent.content.size > 0
          ? new Slice(Fragment.from(originalBlockContent), depth + 2, depth + 2)
          : undefined
      );

      state.tr.scrollIntoView();
    }

    return true;
  };
