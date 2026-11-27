import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
} from "@blocknote/react";
import { MdDelete } from "react-icons/md";

// Custom Side Menu button to remove the hovered block.
export function RemoveBlockButton() {
  const editor = useBlockNoteEditor();

  const Components = useComponentsContext()!;

  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => (state ? editor.getBlock(state.blockId) : undefined),
  });

  if (block === undefined) {
    return null;
  }

  return (
    <Components.SideMenu.Button
      label="Remove block"
      icon={
        <MdDelete
          size={24}
          onClick={() => {
            if (editor.getBlock(block.id)) {
              editor.removeBlocks([block.id]);
            }
          }}
        />
      }
    />
  );
}
