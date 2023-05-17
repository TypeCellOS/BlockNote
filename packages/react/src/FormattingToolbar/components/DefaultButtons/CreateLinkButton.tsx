import { useCallback } from "react";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { RiLink } from "react-icons/ri";
import LinkToolbarButton from "../LinkToolbarButton";
import { formatKeyboardShortcut } from "../../../utils";

export const CreateLinkButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const setLink = useCallback(
    (url: string, text?: string) => {
      props.editor.focus();
      props.editor.createLink(url, text);
    },
    [props.editor]
  );

  return (
    <LinkToolbarButton
      isSelected={!!props.editor.getSelectedLinkUrl()}
      mainTooltip="Link"
      secondaryTooltip={formatKeyboardShortcut("Mod+K")}
      icon={RiLink}
      hyperlinkIsActive={!!props.editor.getSelectedLinkUrl()}
      activeHyperlinkUrl={props.editor.getSelectedLinkUrl() || ""}
      activeHyperlinkText={props.editor.getSelectedText()}
      setHyperlink={setLink}
    />
  );
};
