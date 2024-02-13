import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { useCallback, useState } from "react";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";

import { formatKeyboardShortcut } from "@blocknote/core";
import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { useEditorContentOrSelectionChange } from "../../../hooks/useEditorContentOrSelectionChange";

export const NestBlockButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [canNestBlock, setCanNestBlock] = useState<boolean>(() =>
    props.editor.canNestBlock()
  );

  useEditorContentOrSelectionChange(() => {
    props.editor.canNestBlock();
    setCanNestBlock(props.editor.canNestBlock());
  }, props.editor);

  const nestBlock = useCallback(() => {
    props.editor.focus();
    props.editor.nestBlock();
  }, [props.editor]);

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

export const UnnestBlockButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [canUnnestBlock, setCanUnnestBlock] = useState<boolean>(() =>
    props.editor.canUnnestBlock()
  );

  useEditorContentOrSelectionChange(() => {
    setCanUnnestBlock(props.editor.canUnnestBlock());
  }, props.editor);

  const unnestBlock = useCallback(() => {
    props.editor.focus();
    props.editor.unnestBlock();
  }, [props]);

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
