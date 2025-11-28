import {
  blockHasType,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback } from "react";
import { RiDownload2Fill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
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

  const block = useEditorState({
    editor,
    selector: ({ editor }) => {
      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      if (selectedBlocks.length !== 1) {
        return undefined;
      }

      const block = selectedBlocks[0];

      if (
        !blockHasType(block, editor, block.type, {
          url: "string",
        })
      ) {
        return undefined;
      }

      return block;
    },
  });

  const onClick = useCallback(() => {
    if (block !== undefined) {
      editor.focus();

      if (!editor.resolveFileUrl) {
        window.open(sanitizeUrl(block.props.url, window.location.href));
      } else {
        editor
          .resolveFileUrl(block.props.url)
          .then((downloadUrl) =>
            window.open(sanitizeUrl(downloadUrl, window.location.href)),
          );
      }
    }
  }, [block, editor]);

  if (block === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={
        dict.formatting_toolbar.file_download.tooltip[block.type] ||
        dict.formatting_toolbar.file_download.tooltip["file"]
      }
      mainTooltip={
        dict.formatting_toolbar.file_download.tooltip[block.type] ||
        dict.formatting_toolbar.file_download.tooltip["file"]
      }
      icon={<RiDownload2Fill />}
      onClick={onClick}
    />
  );
};
