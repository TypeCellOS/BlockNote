import {
  BlockSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useState } from "react";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../../../hooks/useEditorContentOrSelectionChange";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";

export const NestBlockButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [canNestBlock, setCanNestBlock] = useState<boolean>(() =>
    editor.canNestBlock()
  );

  useEditorContentOrSelectionChange(() => {
    setCanNestBlock(editor.canNestBlock());
  }, editor);

  const nestBlock = useCallback(() => {
    editor.focus();
    editor.nestBlock();
  }, [editor]);

  return (
    <ToolbarButton
      onClick={nestBlock}
      isDisabled={!canNestBlock}
      mainTooltip="Nest Block"
      secondaryTooltip={formatKeyboardShortcut("Tab")}
      icon={RiIndentIncrease}
    />
  );
};

export const UnnestBlockButton = () => {
  const editor = useBlockNoteEditor<any, any, any>();

  const [canUnnestBlock, setCanUnnestBlock] = useState<boolean>(() =>
    editor.canUnnestBlock()
  );

  useEditorContentOrSelectionChange(() => {
    setCanUnnestBlock(editor.canUnnestBlock());
  }, editor);

  const unnestBlock = useCallback(() => {
    editor.focus();
    editor.unnestBlock();
  }, [editor]);

  return (
    <ToolbarButton
      onClick={unnestBlock}
      isDisabled={!canUnnestBlock}
      mainTooltip="Unnest Block"
      secondaryTooltip={formatKeyboardShortcut("Shift+Tab")}
      icon={RiIndentDecrease}
    />
  );
};
