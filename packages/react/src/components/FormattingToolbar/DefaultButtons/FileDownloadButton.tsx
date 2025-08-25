import {
  blockHasType,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { RiDownload2Fill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { sanitizeUrl } from "../../../util/sanitizeUrl.js";

export const FileDownloadButton = () => {
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
    if (fileBlock && fileBlock.props.url) {
      editor.focus();

      if (!editor.resolveFileUrl) {
        window.open(sanitizeUrl(fileBlock.props.url, window.location.href));
      } else {
        editor
          .resolveFileUrl(fileBlock.props.url)
          .then((downloadUrl) =>
            window.open(sanitizeUrl(downloadUrl, window.location.href)),
          );
      }
    }
  }, [editor, fileBlock]);

  if (!fileBlock || fileBlock.props.url === "") {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={
        dict.formatting_toolbar.file_download.tooltip[fileBlock.type] ||
        dict.formatting_toolbar.file_download.tooltip["file"]
      }
      mainTooltip={
        dict.formatting_toolbar.file_download.tooltip[fileBlock.type] ||
        dict.formatting_toolbar.file_download.tooltip["file"]
      }
      icon={<RiDownload2Fill />}
      onClick={onClick}
    />
  );
};
