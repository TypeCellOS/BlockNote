import Tippy from "@tippyjs/react";
import DragHandleMenu from "./DragHandleMenu";
import styles from "./DragHandle.module.css";
import React, { useState } from "react";
import { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { findBlock } from "../../Blocks/helpers/findBlock";
import { SlashMenuPluginKey } from "../../SlashMenu/SlashMenuExtension";

export const DragHandle = (props: {
  view: EditorView;
  coords: { left: number; top: number };
  onShow?: () => void;
  onHide?: () => void;
  onAddClicked?: () => void;
}) => {
  const [clicked, setClicked] = useState<boolean>(false);
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
    setClicked(true);
    if (props.onAddClicked) {
      props.onAddClicked();
    }
    const pos = props.view.posAtCoords(props.coords);
    if (!pos) {
      return;
    }
    const currentBlock = findBlock(
      TextSelection.create(props.view.state.doc, pos.pos)
    );
    if (!currentBlock) {
      return;
    }
    // If current blocks content is empty dont create a new block
    if (currentBlock.node.firstChild?.textContent.length === 0) {
      // Give block content isFilter att
      props.view.dispatch(
        props.view.state.tr.setNodeMarkup(currentBlock.pos + 1, undefined, {
          isFilter: true,
        })
      );
    } else {
      // Create new block after current block
      const endOfBlock = currentBlock.pos + currentBlock.node.nodeSize;
      let newBlock = props.view.state.schema.nodes["tccontent"].createAndFill({
        isFilter: true,
      });
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
      props.view.state.tr.scrollIntoView().setMeta(SlashMenuPluginKey, {
        // TODO import suggestion plugin key
        activate: true,
        type: "drag",
      })
    );
  };

  if (deleted || clicked) {
    return null;
  }

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
