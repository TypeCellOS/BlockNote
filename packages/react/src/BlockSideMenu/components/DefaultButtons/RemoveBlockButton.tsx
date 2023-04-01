import { BlockNoteEditor } from "@blocknote/core";
import { Menu } from "@mantine/core";
import { useState } from "react";

export const RemoveBlockButton = (props: {
  editor: BlockNoteEditor;
  closeMenu: () => void;
}) => {
  const [block] = useState(props.editor.getMouseCursorPosition()?.block);

  return (
    <Menu.Item
      component={"div"}
      onClick={() => {
        props.closeMenu();
        block && props.editor.removeBlocks([block]);
      }}>
      Delete
    </Menu.Item>
  );
};
