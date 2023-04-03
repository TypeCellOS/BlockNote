import { useCallback } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { RiLink } from "react-icons/ri";
import LinkToolbarButton from "../LinkToolbarButton";
import { formatKeyboardShortcut } from "../../../utils";

export const CreateLinkButton = (props: { editor: BlockNoteEditor }) => {
  const linkIsActive = () => !!props.editor.getActiveLink().url;

  const activeLinkUrl = () => {
    const link = props.editor.getActiveLink();
    return link !== undefined ? link.url : "";
  };

  const activeLinkText = () => {
    const link = props.editor.getActiveLink();
    return link !== undefined ? link.text : "";
  };

  const setLink = useCallback(
    (url: string, text?: string) => {
      props.editor.focus();
      props.editor.createLink(url, text);
    },
    [props.editor]
  );

  return (
    <LinkToolbarButton
      isSelected={linkIsActive()}
      mainTooltip="Link"
      secondaryTooltip={formatKeyboardShortcut("Mod+K")}
      icon={RiLink}
      hyperlinkIsActive={linkIsActive()}
      activeHyperlinkUrl={activeLinkUrl()}
      activeHyperlinkText={activeLinkText()}
      setHyperlink={setLink}
    />
  );
};
