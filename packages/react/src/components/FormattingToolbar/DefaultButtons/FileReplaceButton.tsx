import {
  blockHasType,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { RiImageEditFill } from "react-icons/ri";
import type { FC } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { FilePanel } from "../../FilePanel/FilePanel.js";
import type { FilePanelProps } from "../../FilePanel/FilePanelProps.js";

export type FileReplaceButtonProps = {
  /**
   * The file panel rendered inside the replace-file popover.
   *
   * Defaults to {@link FilePanel}.
   */
  filePanel?: FC<FilePanelProps>;
};

/**
 * By default, the FileReplaceButton component renders a FilePanel in its
 * popover. However, you can override the file panel by passing the
 * `filePanel` prop. You can use the default FilePanel with custom tabs or make
 * your own file panel component.
 */
export function FileReplaceButton(props: FileReplaceButtonProps) {
  const dict = useDictionary();
  const Components = useComponentsContext()!;
  const FilePanelComponent = props.filePanel ?? FilePanel;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const block = useEditorState({
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

      return block;
    },
  });

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root position={"bottom"}>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          mainTooltip={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip["file"]
          }
          label={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip["file"]
          }
          icon={<RiImageEditFill />}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-panel-popover"}
        variant={"panel-popover"}
      >
        <FilePanelComponent blockId={block.id} />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
}
