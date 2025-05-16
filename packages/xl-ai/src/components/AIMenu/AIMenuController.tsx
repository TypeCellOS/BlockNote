import { useBlockNoteEditor } from "@blocknote/react";
import { FC } from "react";
import { useStore } from "zustand";

import { getAIExtension } from "../../AIExtension.js";
import { AIMenuProps, AIMenu } from "./AIMenu.js";
import { BlockPositioner } from "./BlockPositioner.js";

export const AIMenuController = (props: { aiMenu?: FC<AIMenuProps> }) => {
  const editor = useBlockNoteEditor();
  const ai = getAIExtension(editor);

  const aiMenuState = useStore(ai.store, (state) => state.aiMenuState);

  const blockId = aiMenuState === "closed" ? undefined : aiMenuState.blockId;

  const Component = props.aiMenu || AIMenu;

  return (
    <BlockPositioner
      blockID={blockId}
      onOpenChange={(open) => {
        if (
          !open &&
          aiMenuState !== "closed" &&
          (aiMenuState.status === "user-input" ||
            aiMenuState.status === "error")
        ) {
          ai.closeAIMenu();
        }
      }}
    >
      <Component />
    </BlockPositioner>
  );
};
