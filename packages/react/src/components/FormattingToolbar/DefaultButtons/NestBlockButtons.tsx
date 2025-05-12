import {
  BlockSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo, useState } from "react";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorContentOrSelectionChange } from "../../../hooks/useEditorContentOrSelectionChange.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const NestBlockButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);

  const [canNestBlock, setCanNestBlock] = useState<boolean>(() =>
    editor.canNestBlock(),
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
      (block) => editor.schema.blockSchema[block.type].content !== "inline",
    );
  }, [editor.schema.blockSchema, selectedBlocks]);

  if (!show || !editor.isEditable) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      data-test="nestBlock"
      onClick={nestBlock}
      isDisabled={!canNestBlock}
      label={dict.formatting_toolbar.nest.tooltip}
      mainTooltip={dict.formatting_toolbar.nest.tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar.nest.secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<RiIndentIncrease />}
    />
  );
};

export const UnnestBlockButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const selectedBlocks = useSelectedBlocks(editor);

  const [canUnnestBlock, setCanUnnestBlock] = useState<boolean>(() =>
    editor.canUnnestBlock(),
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
      (block) => editor.schema.blockSchema[block.type].content !== "inline",
    );
  }, [editor.schema.blockSchema, selectedBlocks]);

  if (!show || !editor.isEditable) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      data-test="unnestBlock"
      onClick={unnestBlock}
      isDisabled={!canUnnestBlock}
      label={dict.formatting_toolbar.unnest.tooltip}
      mainTooltip={dict.formatting_toolbar.unnest.tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar.unnest.secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<RiIndentDecrease />}
    />
  );
};
