import { ReactNode, useState } from "react";
import { Menu } from "@mantine/core";
import { BlockNoteEditor } from "@blocknote/core";

export const RemoveBlockButton = (props: {
  editor: BlockNoteEditor;
  closeMenu: () => void;
  children: ReactNode;
}) => {
  const [block] = useState(props.editor.getMouseCursorPosition()?.block);

  return (
    <Menu.Item
      onClick={() => {
        props.closeMenu();
        block && props.editor.removeBlocks([block]);
      }}>
      {props.children}
    </Menu.Item>
  );
};
