import { filterSuggestionItems } from "@blocknote/core";
import {
  BlockNoteDefaultUI as BlockNoteDefaultCoreUI,
  BlockNoteDefaultUIProps as BlockNoteDefaultCoreUIProps,
  SuggestionMenuController,
} from "@blocknote/react";

import { AIBlockToolbarController } from "../components/AIBlockToolbar/AIBlockToolbarController";
import { AIInlineToolbarController } from "../components/AIInlineToolbar/AIInlineToolbarController";
import { getDefaultAIMenuItems } from "../components/SuggestionMenu/getDefaultAIMenuItems";
import { useBlockNoteEditor } from "../hooks/useBlockNoteEditor";
import { FormattingToolbarController } from "../components/FormattingToolbar/FormattingToolbarController";
import { getDefaultReactSlashMenuItems } from "../components/SuggestionMenu/getDefaultReactSlashMenuItems";

export type BlockNoteDefaultUIProps = BlockNoteDefaultCoreUIProps & {
  aiBlockToolbar?: boolean;
  aiInlineToolbar?: boolean;
  aiMenu?: boolean;
};

export function BlockNoteDefaultUI(props: BlockNoteDefaultUIProps) {
  const editor = useBlockNoteEditor();

  if (!editor) {
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider"
    );
  }

  return (
    <>
      <BlockNoteDefaultCoreUI formattingToolbar={false} slashMenu={false} />
      {props.formattingToolbar !== false && <FormattingToolbarController />}
      {props.slashMenu !== false && (
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query)
          }
        />
      )}
      {editor.aiBlockToolbar && props.aiBlockToolbar !== false && (
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
