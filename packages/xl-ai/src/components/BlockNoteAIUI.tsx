import { useBlockNoteEditor } from "@blocknote/react";

import { AIMenuController } from "./AIMenu/AIMenuController.js";

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
