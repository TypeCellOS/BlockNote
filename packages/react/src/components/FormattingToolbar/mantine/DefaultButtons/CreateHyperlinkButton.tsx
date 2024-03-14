import { useCallback, useMemo, useState } from "react";
import { RiLink } from "react-icons/ri";

import {
  BlockSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useEditorContentOrSelectionChange } from "../../../../hooks/useEditorContentOrSelectionChange";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdownButton } from "../../../mantine-shared/Toolbar/ToolbarInputDropdownButton";
import { EditHyperlinkMenu } from "../../../HyperlinkToolbar/mantine/EditHyperlinkMenu";

// TODO: Make sure Link is in inline content schema
export const CreateHyperlinkButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

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
    for (const block of selectedBlocks) {
      if (block.content === undefined) {
        return false;
      }
    }

    return true;
  }, [selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarInputDropdownButton
      target={
        <ToolbarButton
          mainTooltip={"Create Link"}
          secondaryTooltip={formatKeyboardShortcut("Mod+K")}
          icon={RiLink}
        />
      }
      dropdown={
        <EditHyperlinkMenu url={url} text={text} editHyperlink={update} />
      }
    />
  );
};
