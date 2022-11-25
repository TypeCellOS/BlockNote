import { useState } from "react";
import { Editor } from "@tiptap/core";
import { ActionIcon, Menu } from "@mantine/core";
import { AiOutlinePlus, MdDragIndicator } from "react-icons/all";
import DragHandleMenu from "./DragHandleMenu";
import { SlashMenuPluginKey } from "../../SlashMenu/SlashMenuExtension";

export const DragHandle = (props: {
  editor: Editor;
  coords: { left: number; top: number };
  onShow?: () => void;
  onHide?: () => void;
  onAddClicked?: () => void;
}) => {
  const [clicked, setClicked] = useState<boolean>(false);
  const [deleted, setDeleted] = useState<boolean>(false);

  const onDelete = () => {
    const pos = props.editor.view.posAtCoords(props.coords);
    if (!pos) return;

    props.editor.commands.BNDeleteBlock(pos.pos);

    setDeleted(true);
  };

  const onAddClick = () => {
    setClicked(true);
    if (props.onAddClicked) props.onAddClicked();

    const pos = props.editor.view.posAtCoords(props.coords);
    if (!pos) return;

    // Creates a new block if current one is not empty.
    props.editor.commands.BNCreateBlockOrSetContentType(pos.pos, "textContent");

    // Focuses and activates the slash menu.
    props.editor.view.focus();
    props.editor.view.dispatch(
      props.editor.view.state.tr.scrollIntoView().setMeta(SlashMenuPluginKey, {
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
