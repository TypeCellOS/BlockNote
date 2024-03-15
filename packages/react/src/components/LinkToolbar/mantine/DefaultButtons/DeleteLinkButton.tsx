import { RiLinkUnlink } from "react-icons/ri";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { LinkToolbarProps } from "../../LinkToolbarProps";

export const DeleteLinkButton = (
  props: Pick<LinkToolbarProps, "deleteLink">
) => (
  <ToolbarButton
    mainTooltip="Remove link"
    isSelected={false}
    onClick={props.deleteLink}
    icon={RiLinkUnlink}
  />
);
