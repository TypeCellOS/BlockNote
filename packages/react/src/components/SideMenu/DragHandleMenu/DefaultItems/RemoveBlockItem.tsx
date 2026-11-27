import { SideMenuExtension } from "@blocknote/core/extensions";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../../../hooks/useExtension.js";

export const RemoveBlockItem = (props: { children: ReactNode }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => (state ? editor.getBlock(state.blockId) : undefined),
  });

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Menu.Item
      className={"bn-menu-item"}
      onClick={() => {
        const blockId = block.id;
        if (!editor.getBlock(blockId)) {
          return;
        }
        const selectedBlocks = editor.getSelection()?.blocks;
        const blocksToRemove =
          selectedBlocks && selectedBlocks.some((b) => b.id === blockId)
            ? selectedBlocks
            : [blockId];
        editor.removeBlocks(blocksToRemove);
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
};
