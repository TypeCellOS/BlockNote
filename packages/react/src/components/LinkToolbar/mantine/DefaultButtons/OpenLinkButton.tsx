import { RiExternalLinkFill } from "react-icons/ri";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { LinkToolbarProps } from "../../LinkToolbarProps";

export const OpenLinkButton = (props: Pick<LinkToolbarProps, "url">) => (
  <ToolbarButton
    mainTooltip="Open in new tab"
    isSelected={false}
    onClick={() => {
      window.open(props.url, "_blank");
    }}
    icon={RiExternalLinkFill}
  />
);
