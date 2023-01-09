import { useState } from "react";
import { EditHyperlinkMenu } from "../EditHyperlinkMenu/components/EditHyperlinkMenu";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { RiExternalLinkFill, RiLinkUnlink } from "react-icons/ri";
// import rootStyles from "../../../root.module.css";

export type HyperlinkMenuProps = {
  url: string;
  text: string;
  update: (url: string, text: string) => void;
  remove: () => void;
};

/**
 * Main menu component for the hyperlink extension.
 * Either renders a menu to create/edit a hyperlink, or a menu to interact with it on mouse hover.
 */
export const HyperlinkMenu = (props: HyperlinkMenuProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <EditHyperlinkMenu
        url={props.url}
        text={props.text}
        update={props.update}
      />
    );
  }

  return (
    <Toolbar>
      <ToolbarButton
        mainTooltip="Edit"
        isSelected={false}
        onClick={() => setIsEditing(true)}>
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
