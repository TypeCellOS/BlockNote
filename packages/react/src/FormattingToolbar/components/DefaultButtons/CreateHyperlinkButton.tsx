import { formatKeyboardShortcut } from "../../../utils";
import { RiLink } from "react-icons/ri";
import LinkToolbarButton from "../LinkToolbarButton";

export type CreateHyperlinkButtonProps = {
  hyperlinkIsActive: boolean;
  activeHyperlinkUrl: string;
  activeHyperlinkText: string;
  setHyperlink: (url: string, text?: string) => void;
};

export const CreateHyperlinkButton = (props: CreateHyperlinkButtonProps) => (
  <LinkToolbarButton
    isSelected={props.hyperlinkIsActive}
    mainTooltip="Link"
    secondaryTooltip={formatKeyboardShortcut("Mod+K")}
    icon={RiLink}
    hyperlinkIsActive={props.hyperlinkIsActive}
    activeHyperlinkUrl={props.activeHyperlinkUrl}
    activeHyperlinkText={props.activeHyperlinkText}
    setHyperlink={props.setHyperlink}
  />
);
