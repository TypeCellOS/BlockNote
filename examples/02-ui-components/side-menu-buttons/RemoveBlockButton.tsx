import {
  SideMenuButton,
  SideMenuProps,
  useBlockNoteEditor,
} from "@blocknote/react";
import { MdDelete } from "react-icons/md";

export function RemoveBlockButton(props: SideMenuProps) {
  const editor = useBlockNoteEditor();

  return (
    <SideMenuButton>
      <MdDelete
        size={24}
        onClick={() => {
          editor.removeBlocks([props.block]);
        }}
      />
    </SideMenuButton>
  );
}
