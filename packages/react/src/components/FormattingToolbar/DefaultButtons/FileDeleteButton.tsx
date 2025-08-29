import {
  blockHasType,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { RiDeleteBin7Line } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const FileDeleteButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);

  const fileBlock = useMemo(() => {
    // Checks if only one block is selected.
    if (selectedBlocks.length !== 1) {
      return undefined;
    }

    const block = selectedBlocks[0];

    if (blockHasType(block, editor, block.type, { url: "string" })) {
      return block;
    }

    return undefined;
  }, [editor, selectedBlocks]);

  const onClick = useCallback(() => {
    editor.focus();
    editor.removeBlocks([fileBlock!]);
  }, [editor, fileBlock]);

  if (!fileBlock || fileBlock.props.url === "" || !editor.isEditable) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={
        dict.formatting_toolbar.file_delete.tooltip[fileBlock.type] ||
        dict.formatting_toolbar.file_delete.tooltip["file"]
      }
      mainTooltip={
        dict.formatting_toolbar.file_delete.tooltip[fileBlock.type] ||
        dict.formatting_toolbar.file_delete.tooltip["file"]
      }
      icon={<RiDeleteBin7Line />}
      onClick={onClick}
    />
  );
};
