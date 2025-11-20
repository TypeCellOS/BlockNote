import { SideMenu } from "@blocknote/core";
import {
  useBlockNoteEditor,
  useComponentsContext,
  usePlugin,
} from "@blocknote/react";
import { MdDelete } from "react-icons/md";

// Custom Side Menu button to remove the hovered block.
export function RemoveBlockButton() {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  const sideMenu = usePlugin(SideMenu);

  return (
    <Components.SideMenu.Button
      label="Remove block"
      icon={
        <MdDelete
          size={24}
          onClick={() => {
            editor.removeBlocks([sideMenu.store.state!.block]);
          }}
        />
      }
    />
  );
}
