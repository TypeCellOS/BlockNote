import { filterSuggestionItems } from "@blocknote/core";
import { SuggestionMenuController } from "@blocknote/react";

import { useBlockNoteEditor } from "@blocknote/react";
import { AIBlockToolbarController } from "../components/AIBlockToolbar/AIBlockToolbarController";
import { AIInlineToolbarController } from "../components/AIInlineToolbar/AIInlineToolbarController";
import { getDefaultAIMenuItems } from "../components/SuggestionMenu/getDefaultAIMenuItems";

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
      {props.aiMenu !== false && (
        <SuggestionMenuController
          triggerCharacter="`"
          getItems={async (query) =>
            filterSuggestionItems(getDefaultAIMenuItems(editor, query), query)
          }
        />
      )}
    </>
  );
}
