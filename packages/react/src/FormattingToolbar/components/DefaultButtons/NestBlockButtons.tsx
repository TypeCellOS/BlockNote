import { formatKeyboardShortcut } from "../../../utils";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { useCallback } from "react";

export const NestBlockButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const nestBlock = useCallback(() => {
    props.editor.focus();
    props.editor.nestBlock();
  }, [props]);

  const canNestBlock = useCallback(() => props.editor.canNestBlock(), [props]);

  return (
    <ToolbarButton
      onClick={nestBlock}
      isDisabled={!canNestBlock()}
      mainTooltip="Nest Block"
      secondaryTooltip={formatKeyboardShortcut("Tab")}
      icon={RiIndentIncrease}
    />
  );
};

export const UnnestBlockButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const unnestBlock = useCallback(() => {
    props.editor.focus();
    props.editor.unnestBlock();
  }, [props]);

  const canUnnestBlock = useCallback(
    () => props.editor.canUnnestBlock(),
    [props]
  );

  return (
    <ToolbarButton
      onClick={unnestBlock}
      isDisabled={!canUnnestBlock()}
      mainTooltip="Unnest Block"
      secondaryTooltip={formatKeyboardShortcut("Shift+Tab")}
      icon={RiIndentDecrease}
    />
  );
};
