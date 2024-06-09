import {
  SideMenuProps,
  useBlockNoteEditor,
  useComponentsContext,
} from "@blocknote/react";
import { MdDelete } from "react-icons/md";

// Custom Side Menu button to remove the hovered block.
export function RemoveBlockButton(props: SideMenuProps) {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  return (
    <Components.SideMenu.Button
      label="Remove block"
      icon={
        <MdDelete
          size={24}
          onClick={() => {
            editor.removeBlocks([props.block]);
          }}
        />
      }
    />
  );
}
