import { useBlockNoteEditor } from "@blocknote/react";
import { AIBlockToolbarController } from "./AIBlockToolbar/AIBlockToolbarController";
import { AIInlineToolbarController } from "./AIInlineToolbar/AIInlineToolbarController";
import { AIMenuController } from "./AIMenu/AIMenuController";

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
      {editor.extensions.aiBlockToolbar && props.aiBlockToolbar !== false && (
        <AIBlockToolbarController />
      )}
      {props.aiInlineToolbar !== false && <AIInlineToolbarController />}
      {props.aiMenu !== false && <AIMenuController />}
    </>
  );
}
