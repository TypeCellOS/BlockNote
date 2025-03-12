import { useBlockNoteEditor } from "@blocknote/react";

import { useEffect } from "react";
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
      {/* {editor.extensions.aiBlockToolbar && props.aiBlockToolbar !== false && (
        <AIBlockToolbarController />
      )} */}
      {props.aiMenu !== false && <AIMenuController />}
    </>
  );
}

const AIMenuController = () => {
  const editor = useBlockNoteEditor();
  const ctx = useBlockNoteAIContext();

  useEffect(() => {
    if (ctx.aiMenuBlockID) {
      editor.setForceSelectionVisible(true);
    }
  }, [ctx.aiMenuBlockID]);

  return (
    <BlockPositioner
      blockID={ctx.aiMenuBlockID}
      onOpenChange={(open) => {
        if (!open && ctx.aiMenuBlockID) {
          ctx.setAiMenuBlockID(undefined);
          ctx.setAIResponseStatus("initial");
          ctx.setPrevDocument(undefined);
          editor.setForceSelectionVisible(false);
          editor.focus();
          // TODO: doesn't work with esc?
        }
      }}>
      <AIMenu />
    </BlockPositioner>
  );
};
