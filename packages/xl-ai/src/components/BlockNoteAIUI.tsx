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

  const aiMenuState = useStore(ai.store, (state) => state.aiMenuState);

  const blockId = aiMenuState === "closed" ? undefined : aiMenuState.blockId;

  useEffect(() => {
    if (
      aiMenuState !== "closed" &&
      (aiMenuState.status === "user-input" || aiMenuState.status === "thinking")
    ) {
      // when we just open the menu, keep showing selection
      editor.setForceSelectionVisible(true);
    } else {
      // when AI is making changes to the doc, hide the selection as it's too cluttered
      editor.setForceSelectionVisible(false);
    }
  }, [aiMenuState, editor]);

  return (
    <BlockPositioner
      blockID={blockId}
      onOpenChange={(open) => {
        if (!open && blockId) {
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
