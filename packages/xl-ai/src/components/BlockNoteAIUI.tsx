import { useBlockNoteEditor } from "@blocknote/react";

import { useEffect } from "react";
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
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider"
    );
  }

  return (
    <>
      {/* {editor.extensions.aiBlockToolbar && props.aiBlockToolbar !== false && (
        <AIBlockToolbarController />
      )} */}
      {props.aiMenu !== false && <AIMenuController />}
    </>
  );
}

const AIMenuController = () => {
  const editor = useBlockNoteEditor();
  const ai = getAIExtension(editor);

  const aiMenuBlockID = useStore(ai.store, (state) =>
    state.aiMenuState === "closed" ? undefined : state.aiMenuState.blockId
  );

  useEffect(() => {
    if (aiMenuBlockID) {
      editor.setForceSelectionVisible(true);
    }
  }, [aiMenuBlockID, editor]);

  return (
    <BlockPositioner
      blockID={aiMenuBlockID}
      onOpenChange={(open) => {
        if (!open && aiMenuBlockID) {
          ai.closeAIMenu();
          editor.setForceSelectionVisible(false);
          editor.focus();
          // TODO: doesn't work with esc?
        }
      }}>
      <AIMenu />
    </BlockPositioner>
  );
};
