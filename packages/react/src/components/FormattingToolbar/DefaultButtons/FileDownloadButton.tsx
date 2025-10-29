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

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return undefined;
      }

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

      return { blockId: block.id, blockType: block.type, url: block.props.url };
    },
  });

  const onClick = useCallback(() => {
    if (state !== undefined) {
      editor.focus();

      if (!editor.resolveFileUrl) {
        window.open(sanitizeUrl(state.url, window.location.href));
      } else {
        editor
          .resolveFileUrl(state.url)
          .then((downloadUrl) =>
            window.open(sanitizeUrl(downloadUrl, window.location.href)),
          );
      }
    }
  }, [editor, state]);

  if (state === undefined) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={
        dict.formatting_toolbar.file_download.tooltip[state.blockType] ||
        dict.formatting_toolbar.file_download.tooltip["file"]
      }
      mainTooltip={
        dict.formatting_toolbar.file_download.tooltip[state.blockType] ||
        dict.formatting_toolbar.file_download.tooltip["file"]
      }
      icon={<RiDownload2Fill />}
      onClick={onClick}
    />
  );
};
