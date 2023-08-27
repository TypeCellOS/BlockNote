import { useCallback, useMemo, useState } from "react";
import { Block, BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { RiLink } from "react-icons/ri";
import LinkToolbarButton from "../LinkToolbarButton";
import { formatKeyboardShortcut } from "../../../utils";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";

export const CreateLinkButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [selectedBlocks, setSelectedBlocks] = useState<Block<BSchema>[]>(
    props.editor.getSelection()?.blocks || [
      props.editor.getTextCursorPosition().block,
    ]
  );
  const [url, setUrl] = useState<string>(
    props.editor.getSelectedLinkUrl() || ""
  );
  const [text, setText] = useState<string>(
    props.editor.getSelectedText() || ""
  );

  useEditorSelectionChange(props.editor, () => {
    setSelectedBlocks(
      props.editor.getSelection()?.blocks || [
        props.editor.getTextCursorPosition().block,
      ]
    );
    setText(props.editor.getSelectedText() || "");
    setUrl(props.editor.getSelectedLinkUrl() || "");
  });

  const setLink = useCallback(
    (url: string, text?: string) => {
      props.editor.focus();
      props.editor.createLink(url, text);
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
    <LinkToolbarButton
      isSelected={!!url}
      mainTooltip="Link"
      secondaryTooltip={formatKeyboardShortcut("Mod+K")}
      icon={RiLink}
      hyperlinkIsActive={!!url}
      activeHyperlinkUrl={url}
      activeHyperlinkText={text}
      setHyperlink={setLink}
    />
  );
};
