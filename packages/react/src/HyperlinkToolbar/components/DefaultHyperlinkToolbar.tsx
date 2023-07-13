import { useState } from "react";
import { RiExternalLinkFill, RiLinkUnlink } from "react-icons/ri";

import { HyperlinkToolbarProps } from "./HyperlinkToolbarWrapper";

import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { EditHyperlinkMenu } from "../EditHyperlinkMenu/components/EditHyperlinkMenu";

export const DefaultHyperlinkToolbar = (props: HyperlinkToolbarProps) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  if (isEditing) {
    return (
      <EditHyperlinkMenu
        url={props.url}
        text={props.text}
        update={(url, text) => props.editHyperlink(url, text)}
        // TODO: Better way of waiting for fade out
        onBlur={() => setTimeout(() => setIsEditing(false), 500)}
      />
    );
  }

  return (
    <Toolbar
      // TODO: This should go back in the plugin.
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={props.stopHideTimer}
      onMouseLeave={props.startHideTimer}>
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
        onClick={props.deleteHyperlink}
        icon={RiLinkUnlink}
      />
    </Toolbar>
  );
};
