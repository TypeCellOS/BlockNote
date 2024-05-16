import {
  BlockSchema,
  checkBlockIsDefaultType,
  checkDefaultBlockTypeInSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { RiImageAddFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { useDictionary } from "../../../i18n/dictionary";

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

    if (checkBlockIsDefaultType("file", block, editor)) {
      return block;
    }

    return undefined;
  }, [editor, selectedBlocks]);

  // TODO: Where can we store the extensions such that we can access them here?
  const fileBlockHasPreview = useMemo(() => {
    return (
      fileBlock?.props.fileType === "image" ||
      fileBlock?.props.fileType === "audio" ||
      fileBlock?.props.fileType === "video"
    );
  }, [fileBlock]);

  const onClick = useCallback(() => {
    if (fileBlock && checkDefaultBlockTypeInSchema("file", editor)) {
      editor.updateBlock(fileBlock, {
        type: "file",
        props: {
          showPreview: !fileBlock.props.showPreview,
        },
      });
    }
  }, [editor, fileBlock]);

  if (!fileBlock || !fileBlock.props.url || !fileBlockHasPreview) {
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
