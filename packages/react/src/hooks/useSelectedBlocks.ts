import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useState } from "react";
import { useBlockNoteContext } from "../editor/BlockNoteContext";
import { useEditorContentOrSelectionChange } from "./useEditorContentOrSelectionChange";

export function useSelectedBlocks<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(editor?: BlockNoteEditor<BSchema, ISchema, SSchema>) {
  const editorContext = useBlockNoteContext<BSchema, ISchema, SSchema>();
  if (!editor) {
    editor = editorContext?.editor;
  }

  if (!editor) {
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument"
    );
  }

  const e = editor;

  const [selectedBlocks, setSelectedBlocks] = useState<
    Block<BSchema, ISchema, SSchema>[]
  >(() => e.getSelection()?.blocks || [e.getTextCursorPosition().block]);

  useEditorContentOrSelectionChange(
    () =>
      setSelectedBlocks(
        e.getSelection()?.blocks || [e.getTextCursorPosition().block]
      ),
    e
  );

  return selectedBlocks;
}
