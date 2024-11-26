import { useBlockNoteEditor } from "@blocknote/react";
import { AIBlockToolbarController } from "./AIBlockToolbar/AIBlockToolbarController.js";

import { AIMenu } from "./AIMenu/AIMenu.js";
import { BlockPositioner } from "./AIMenu/BlockPositioner.js";
import { useBlockNoteAIContext } from "./BlockNoteAIContext.js";

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
      {props.aiMenu !== false && <AIMenuController />}
    </>
  );
}

const AIMenuController = () => {
  const editor = useBlockNoteEditor();
  const ctx = useBlockNoteAIContext();

  return (
    <BlockPositioner
      blockID={ctx.aiMenuBlockID}
      onOpenChange={(open) => {
        if (!open && ctx.aiMenuBlockID) {
          ctx.setAiMenuBlockID(undefined);
          editor.focus();
          // TODO: doesn't work with esc?
        }
      }}>
      <AIMenu />
    </BlockPositioner>
  );
};
