import { EditorState } from "prosemirror-state";

export const createBlockCommand =
  (pos: number) =>
  ({
    state,
    dispatch,
  }: {
    state: EditorState;
    dispatch: ((args?: any) => any) | undefined;
  }) => {
    const newBlock = state.schema.nodes["blockContainer"].createAndFill()!;

    if (dispatch) {
      state.tr.insert(pos, newBlock).scrollIntoView();
    }

    return true;
  };
