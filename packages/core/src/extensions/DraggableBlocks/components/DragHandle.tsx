import Tippy from "@tippyjs/react";
import DragHandleMenu from "./DragHandleMenu";
import styles from "./DragHandle.module.css";
import React, { useState } from "react";
import { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { findBlock } from "../../Blocks/helpers/findBlock";

export const DragHandle = (props: {
  view: EditorView;
  coords: { left: number; top: number };
  onShow?: () => void;
  onHide?: () => void;
}) => {
  const [deleted, setDeleted] = useState<boolean>(false);

  const onDelete = () => {
    const pos = props.view.posAtCoords(props.coords);
    if (!pos) {
      return;
    }
    const currentBlock = findBlock(
      TextSelection.create(props.view.state.doc, pos.pos)
    );

    if (currentBlock) {
      if (props.view.dispatch) {
        props.view.dispatch(
          props.view.state.tr.deleteRange(
            currentBlock.pos,
            currentBlock.pos + currentBlock.node.nodeSize
          )
        );
      }
      setDeleted(true);
    }
  };

  if (deleted) {
    return null;
  }

  return (
    <Tippy
      content={<DragHandleMenu onDelete={onDelete} />}
      placement={"left"}
      trigger={"click"}
      duration={0}
      interactiveBorder={100}
      interactive={true}
      onShow={props.onShow}
      onHide={props.onHide}>
      <div className={styles.dragHandle} />
    </Tippy>
  );
};
