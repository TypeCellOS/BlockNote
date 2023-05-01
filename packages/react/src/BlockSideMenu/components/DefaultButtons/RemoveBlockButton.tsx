import { ReactNode, useState } from "react";
import { Menu } from "@mantine/core";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";

export const RemoveBlockButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  closeMenu: () => void;
  children: ReactNode;
}) => {
  const [block] = useState(props.editor.getMouseCursorPosition()?.block);

  return (
    <Menu.Item
      component={"div"}
      onClick={() => {
        props.closeMenu();
        block && props.editor.removeBlocks([block]);
      }}>
      {props.children}
    </Menu.Item>
  );
};
