import { RiExternalLinkFill, RiLinkUnlink } from "react-icons/ri";
import { Toolbar } from "../../../shared/components/toolbar/Toolbar";
import { ToolbarButton } from "../../../shared/components/toolbar/ToolbarButton";

type HoverHyperlinkMenuProps = {
  url: string;
  edit: () => void;
  remove: () => void;
};

/**
 * Menu which opens when hovering an existing hyperlink.
 * Provides buttons for editing, opening, and removing the hyperlink.
 */
export const HoverHyperlinkMenu = (props: HoverHyperlinkMenuProps) => {
  return (
    <Toolbar>
      <ToolbarButton mainTooltip="Edit" isSelected={false} onClick={props.edit}>
        Edit Link
      </ToolbarButton>
      <ToolbarButton
        mainTooltip="Open in new tab"
        isSelected={false}
        onClick={() => {
          window.open(props.url, "_blank");
        }}
        icon={RiExternalLinkFill}
      />
      <ToolbarButton
        mainTooltip="Remove link"
        isSelected={false}
        onClick={props.remove}
        icon={RiLinkUnlink}
      />
    </Toolbar>
  );
};
