import { EditorState, TextSelection } from "prosemirror-state";

import { getBlockInfoFromPos } from "../../../getBlockInfoFromPos.js";

export const splitBlockCommand = (
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean
) => {
  return ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    const { blockContainer, blockContent, blockGroup } = getBlockInfoFromPos(
      state.doc,
      posInBlock
    );

    const newBlock = state.schema.nodes["blockContainer"].createAndFill(
      keepProps ? { ...blockContainer.node.attrs, id: undefined } : null,
      [
        state.schema.nodes[
          keepType ? blockContent.node.type.name : "paragraph"
        ].createAndFill(
          keepProps ? blockContent.node.attrs : null,
          blockContent.node.content.cut(posInBlock - blockContent.beforePos - 1)
        )!,
        ...(blockGroup ? [blockGroup.node] : []),
      ]
    )!;

    if (dispatch) {
      // Insert new block
      state.tr.insert(blockContainer.afterPos, newBlock);
      // Update selection
      const newBlockInfo = getBlockInfoFromPos(
        state.doc,
        blockContainer.afterPos
      );
      state.tr.setSelection(
        TextSelection.create(state.doc, newBlockInfo.blockContent.beforePos + 1)
      );
      // Delete original block's children, if they exist
      if (blockGroup) {
        state.tr.delete(blockGroup.beforePos, blockGroup.afterPos);
      }
      // Delete original block's content past the cursor
      state.tr.delete(posInBlock, blockContent.afterPos - 1);

      // state.tr.scrollIntoView();
    }

    return true;
  };
};
