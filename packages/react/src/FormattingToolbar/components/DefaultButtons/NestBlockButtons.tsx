import { formatKeyboardShortcut } from "../../../utils";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { BlockNoteEditor } from "@blocknote/core";
import { useCallback } from "react";

export const NestBlockButton = (props: { editor: BlockNoteEditor }) => {
  const nestBlock = useCallback(() => {
    props.editor.focus();
    props.editor.nestBlock();
  }, [props.editor]);

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

export const UnnestBlockButton = (props: { editor: BlockNoteEditor }) => {
  const unnestBlock = useCallback(() => {
    props.editor.focus();
    props.editor.unnestBlock();
  }, [props]);

  const canUnnestBlock = useCallback(
    () => props.editor.canUnnestBlock(),
    [props.editor]
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
