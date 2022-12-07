import { Editor } from "@tiptap/core";
import { ActionIcon, Menu } from "@mantine/core";
import { AiOutlinePlus, MdDragIndicator } from "react-icons/all";
import DragHandleMenu from "./DragHandleMenu";
import { SlashMenuPluginKey } from "../../SlashMenu/SlashMenuExtension";
import { getBlockInfoFromPos } from "../../Blocks/helpers/getBlockInfoFromPos";

export const DragHandle = (props: {
  editor: Editor;
  coords: { left: number; top: number };
  onShow?: () => void;
  onHide?: () => void;
  onAddClicked?: () => void;
}) => {
  const onDelete = () => {
    const pos = props.editor.view.posAtCoords(props.coords);
    if (!pos) {
      return;
    }

    props.editor.commands.BNDeleteBlock(pos.pos);
  };

  const onAddClick = () => {
    if (props.onAddClicked) {
      props.onAddClicked();
    }

    const pos = props.editor.view.posAtCoords(props.coords);
    if (!pos) {
      return;
    }

    const blockInfo = getBlockInfoFromPos(props.editor.state.doc, pos.pos);
    if (blockInfo === undefined) {
      return;
    }

    const { contentNode, endPos } = blockInfo;

    // Creates a new block if current one is not empty for the suggestion menu to open in.
    if (contentNode.textContent.length !== 0) {
      const newBlockInsertionPos = endPos + 1;
      const newBlockContentPos = newBlockInsertionPos + 2;

      props.editor
        .chain()
        .BNCreateBlock(newBlockInsertionPos)
        .BNSetContentType(newBlockContentPos, "textContent")
        .setTextSelection(newBlockContentPos)
        .run();
    }

    // Focuses and activates the suggestion menu.
    props.editor.view.focus();
    props.editor.view.dispatch(
      props.editor.view.state.tr.scrollIntoView().setMeta(SlashMenuPluginKey, {
        // TODO import suggestion plugin key
        activate: true,
        type: "drag",
      })
    );
  };

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
