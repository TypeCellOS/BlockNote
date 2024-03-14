import { useCallback, useMemo, useState } from "react";
import { RiLink } from "react-icons/ri";

import {
  BlockNoteEditor,
  BlockSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../../../hooks/useEditorContentOrSelectionChange";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputsMenu } from "../../../mantine-shared/Toolbar/ToolbarInputsMenu";
import { EditLinkMenuItems } from "../../../LinkToolbar/mantine/EditLinkMenuItems";

function checkLinkInSchema(
  editor: BlockNoteEditor<BlockSchema, any, StyleSchema>
): editor is BlockNoteEditor<
  BlockSchema,
  {
    link: {
      type: "link";
      propSchema: any;
      content: "styled";
    };
  },
  StyleSchema
> {
  return (
    "link" in editor.schema.inlineContentSchema &&
    editor.schema.inlineContentSchema["link"] === "link"
  );
}

export const CreateLinkButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const linkInSchema = checkLinkInSchema(editor);

  const selectedBlocks = useSelectedBlocks(editor);

  const [url, setUrl] = useState<string>(editor.getSelectedLinkUrl() || "");
  const [text, setText] = useState<string>(editor.getSelectedText());

  useEditorContentOrSelectionChange(() => {
    setText(editor.getSelectedText() || "");
    setUrl(editor.getSelectedLinkUrl() || "");
  }, editor);

  const update = useCallback(
    (url: string, text: string) => {
      editor.createLink(url, text);
      editor.focus();
    },
    [editor]
  );

  const show = useMemo(() => {
    if (!linkInSchema) {
      return false;
    }

    for (const block of selectedBlocks) {
      if (block.content === undefined) {
        return false;
      }
    }

    return true;
  }, [linkInSchema, selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarInputsMenu
      button={
        <ToolbarButton
          mainTooltip={"Create Link"}
          secondaryTooltip={formatKeyboardShortcut("Mod+K")}
          icon={RiLink}
        />
      }
      dropdownItems={
        <EditLinkMenuItems url={url} text={text} editLink={update} />
      }
    />
  );
};
