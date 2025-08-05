import {
  blockHasTypeAndProps,
  BlockSchema,
  editorHasBlockWithTypeAndProps,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { RiImageAddFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const FilePreviewButton = () => {
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

    if (
      blockHasTypeAndProps(block, editor, block.type, {
        url: { default: "" },
        showPreview: { default: true },
      })
    ) {
      return block;
    }

    return undefined;
  }, [editor, selectedBlocks]);

  const onClick = useCallback(() => {
    if (
      fileBlock &&
      editorHasBlockWithTypeAndProps(editor, fileBlock.type, {
        url: { default: "" },
        showPreview: { default: true },
      })
    ) {
      editor.updateBlock(fileBlock, {
        props: {
          showPreview: !fileBlock.props.showPreview,
        },
      });
    }
  }, [editor, fileBlock]);

  if (!fileBlock || fileBlock.props.url === "" || !editor.isEditable) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={"Toggle preview"}
      mainTooltip={dict.formatting_toolbar.file_preview_toggle.tooltip}
      icon={<RiImageAddFill />}
      isSelected={fileBlock.props.showPreview}
      onClick={onClick}
    />
  );
};
