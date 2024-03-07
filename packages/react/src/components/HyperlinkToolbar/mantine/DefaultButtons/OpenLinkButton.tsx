import { RiExternalLinkFill } from "react-icons/ri";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { HyperlinkToolbarProps } from "../../HyperlinkToolbarProps";

export const OpenLinkButton = (props: Pick<HyperlinkToolbarProps, "url">) => (
  <ToolbarButton
    mainTooltip="Open in new tab"
    isSelected={false}
    onClick={() => {
      window.open(props.url, "_blank");
    }}
    icon={RiExternalLinkFill}
  />
);
