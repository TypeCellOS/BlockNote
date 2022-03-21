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

  const onAddClick = () => {
    const pos = props.view.posAtCoords(props.coords);
    if (!pos) return;
    const currentBlock = findBlock(
      TextSelection.create(props.view.state.doc, pos.pos)
    );
    if (!currentBlock) return false;
    // If current blocks content is empty dont create a new block
    if (currentBlock.node.firstChild?.textContent.length === 0) {
      props.view.dispatch(props.view.state.tr.setNodeMarkup(currentBlock.pos));
    } else {
      // Create new block after current block
      const endOfBlock = currentBlock.pos + currentBlock.node.nodeSize;
      let newBlock = props.view.state.schema.nodes["tcblock"].createAndFill();
      props.view.state.tr.insert(endOfBlock, newBlock);
      props.view.dispatch(props.view.state.tr.insert(endOfBlock, newBlock));
      props.view.dispatch(
        props.view.state.tr.setSelection(
          new TextSelection(props.view.state.tr.doc.resolve(endOfBlock + 1))
        )
      );
    }
    props.view.focus();
    props.view.dispatch(
      props.view.state.tr
        .scrollIntoView()
        .setMeta("suggestions-slash-commands$", {
          // TODO import suggestion plugin key
          activate: true,
          type: "drag",
        })
    );
  };

  if (deleted) return null;

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "0.25em" }}>
      <div className={styles.dragHandleAdd} onClick={onAddClick}></div>
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
    </div>
  );
};
