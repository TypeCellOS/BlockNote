import {
  BlockSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo, useState } from "react";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../../../hooks/useEditorContentOrSelectionChange";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";

export const NestBlockButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);

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

  const show = useMemo(() => {
    return !selectedBlocks.find(
      (block) => editor.schema.blockSchema[block.type].content !== "inline"
    );
  }, [editor.schema.blockSchema, selectedBlocks]);

  if (!show) {
    return null;
  }

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

  const selectedBlocks = useSelectedBlocks(editor);

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

  const show = useMemo(() => {
    return !selectedBlocks.find(
      (block) => editor.schema.blockSchema[block.type].content !== "inline"
    );
  }, [editor.schema.blockSchema, selectedBlocks]);

  if (!show) {
    return null;
  }

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
