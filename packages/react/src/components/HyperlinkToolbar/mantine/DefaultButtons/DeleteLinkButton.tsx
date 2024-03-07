import { RiLinkUnlink } from "react-icons/ri";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { HyperlinkToolbarProps } from "../../HyperlinkToolbarProps";

export const DeleteLinkButton = (
  props: Pick<HyperlinkToolbarProps, "deleteHyperlink">
) => (
  <ToolbarButton
    mainTooltip="Remove link"
    isSelected={false}
    onClick={props.deleteHyperlink}
    icon={RiLinkUnlink}
  />
);
