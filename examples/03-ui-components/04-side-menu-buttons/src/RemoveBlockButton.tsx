import {} from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useExtension,
} from "@blocknote/react";
import { MdDelete } from "react-icons/md";

// Custom Side Menu button to remove the hovered block.
export function RemoveBlockButton() {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  const sideMenu = useExtension(SideMenuExtension);

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
