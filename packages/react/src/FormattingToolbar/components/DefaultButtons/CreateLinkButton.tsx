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
    [props]
  );

  const linkIsActive = useCallback(
    () => !!props.editor.getActiveLink().url,
    [props]
  );

  const activeLinkUrl = useCallback(() => {
    const link = props.editor.getActiveLink();
    return link !== undefined ? link.url : "";
  }, [props]);

  const activeLinkText = useCallback(() => {
    const link = props.editor.getActiveLink();
    return link !== undefined ? link.text : "";
  }, [props]);

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
