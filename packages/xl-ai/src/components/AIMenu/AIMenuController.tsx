import { useBlockNoteEditor } from "@blocknote/react";
import { FC } from "react";
import { useStore } from "zustand";

import { getAIExtension } from "../../AIExtension.js";
import { AIMenu, AIMenuProps } from "./AIMenu.js";
import { BlockPositioner } from "./BlockPositioner.js";

export const AIMenuController = (props: { aiMenu?: FC<AIMenuProps> }) => {
  const editor = useBlockNoteEditor();
  const ai = getAIExtension(editor);

  const aiMenuState = useStore(ai.store, (state) => state.aiMenuState);

  const blockId = aiMenuState === "closed" ? undefined : aiMenuState.blockId;

  const Component = props.aiMenu || AIMenu;

  return (
    <BlockPositioner
      canDismissViaOutsidePress={
        aiMenuState === "closed" || aiMenuState.status === "user-input"
      }
      blockID={blockId}
      onOpenChange={(open) => {
        if (open || aiMenuState === "closed") {
          return;
        }
        if (aiMenuState.status === "user-input") {
          ai.closeAIMenu();
        } else if (
          aiMenuState.status === "user-reviewing" ||
          aiMenuState.status === "error"
        ) {
          ai.rejectChanges();
        }
      }}
    >
      <Component />
    </BlockPositioner>
  );
};
