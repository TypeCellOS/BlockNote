import { useBlockNoteEditor } from "@blocknote/react";

import { useStore } from "zustand";
import { getAIExtension } from "../AIExtension.js";
import { AIMenu } from "./AIMenu/AIMenu.js";
import { BlockPositioner } from "./AIMenu/BlockPositioner.js";

export type BlockNoteAIUIProps = {
  aiBlockToolbar?: boolean;
  aiInlineToolbar?: boolean;
  aiMenu?: boolean;
};

export function BlockNoteAIUI(props: BlockNoteAIUIProps) {
  const editor = useBlockNoteEditor();

  if (!editor) {
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider",
    );
  }

  return <>{props.aiMenu !== false && <AIMenuController />}</>;
}

const AIMenuController = () => {
  const editor = useBlockNoteEditor();
  const ai = getAIExtension(editor);

  const aiMenuState = useStore(ai.store, (state) => state.aiMenuState);

  const blockId = aiMenuState === "closed" ? undefined : aiMenuState.blockId;

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
      }}>
      <AIMenu />
    </BlockPositioner>
  );
};
