import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { useCallback, useMemo, useState } from "react";
import { RiLink } from "react-icons/ri";

import { formatKeyboardShortcut } from "@blocknote/core";
import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdownButton } from "../../../components-shared/Toolbar/ToolbarInputDropdownButton";
import { useEditorContentOrSelectionChange } from "../../../hooks/useEditorContentOrSelectionChange";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { EditHyperlinkMenu } from "../../HyperlinkToolbar/EditHyperlinkMenu/components/EditHyperlinkMenu";

export const CreateLinkButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const [url, setUrl] = useState<string>(
    props.editor.getSelectedLinkUrl() || ""
  );
  const [text, setText] = useState<string>(props.editor.getSelectedText());

  useEditorContentOrSelectionChange(() => {
    setText(props.editor.getSelectedText() || "");
    setUrl(props.editor.getSelectedLinkUrl() || "");
  }, props.editor);

  const update = useCallback(
    (url: string, text: string) => {
      props.editor.createLink(url, text);
      props.editor.focus();
    },
    [props.editor]
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
      dropdown={<EditHyperlinkMenu url={url} text={text} update={update} />}
    />
  );
};
