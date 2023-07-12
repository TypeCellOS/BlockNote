import { RiExternalLinkFill, RiLinkUnlink } from "react-icons/ri";
import {
  BaseUiElementCallbacks,
  BaseUiElementState,
  HyperlinkToolbarCallbacks,
  HyperlinkToolbarState,
} from "@blocknote/core";

import { EditHyperlinkMenu } from "../EditHyperlinkMenu/components/EditHyperlinkMenu";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";

export const DefaultHyperlinkToolbar = (
  props: Omit<HyperlinkToolbarCallbacks, keyof BaseUiElementCallbacks> &
    Omit<HyperlinkToolbarState, keyof BaseUiElementState> & {
      isEditing: boolean;
      setIsEditing: (isEditing: boolean) => void;
    }
) => {
  if (props.isEditing) {
    return (
      <EditHyperlinkMenu
        url={props.url}
        text={props.text}
        update={(url, text) => props.editHyperlink(url, text)}
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
        onClick={() => props.setIsEditing(true)}>
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
