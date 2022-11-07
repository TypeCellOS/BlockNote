import { TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useState } from "react";
import { AiOutlinePlus } from "react-icons/ai";
import { findBlock } from "../../Blocks/helpers/findBlock";
import { SlashMenuPluginKey } from "../../SlashMenu/SlashMenuExtension";
import { Menu } from "@mantine/core";
import { MdDragIndicator } from "react-icons/all";
import { ActionIcon } from "@mantine/core";
import DragHandleMenu from "./DragHandleMenu";

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
    if (currentBlock.node.firstChild?.textContent.length !== 0) {
      // Create new block after current block
      const endOfBlock = currentBlock.pos + currentBlock.node.nodeSize;
      let newBlock = props.view.state.schema.nodes["content"].createAndFill()!;
      props.view.state.tr.insert(endOfBlock, newBlock);
      props.view.dispatch(props.view.state.tr.insert(endOfBlock, newBlock));
      props.view.dispatch(
        props.view.state.tr.setSelection(
          new TextSelection(props.view.state.tr.doc.resolve(endOfBlock + 1))
        )
      );
    }
    // Focus and activate slash menu
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
    <div style={{ display: "flex", flexDirection: "row" }}>
      <ActionIcon size={24} color={"brandFinal.3"} data-test={"dragHandleAdd"}>
        {<AiOutlinePlus size={24} onClick={onAddClick} />}
      </ActionIcon>
      <Menu onOpen={props.onShow} onClose={props.onHide} position={"left"}>
        <Menu.Target>
          <ActionIcon size={24} color={"brandFinal.3"} data-test={"dragHandle"}>
            {<MdDragIndicator size={24} />}
          </ActionIcon>
        </Menu.Target>
        <DragHandleMenu onDelete={onDelete} />
      </Menu>
    </div>
  );
};
