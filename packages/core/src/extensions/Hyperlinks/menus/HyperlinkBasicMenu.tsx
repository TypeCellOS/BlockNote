import { useState } from "react";
import { RiExternalLinkFill, RiLinkUnlink } from "react-icons/ri";
import { SimpleToolbarButton } from "../../../shared/components/toolbar/SimpleToolbarButton";
import { Toolbar } from "../../../shared/components/toolbar/Toolbar";
import { ToolbarSeparator } from "../../../shared/components/toolbar/ToolbarSeparator";

type HyperlinkMenuProps = {
  href: string;
  removeHandler: () => void;
  editMenu: React.ReactElement;
};

/**
 * A hyperlink menu shown when an anchor is hovered over.
 * It shows options to edit / remove / open the link
 */
export const HyperlinkBasicMenu = (props: HyperlinkMenuProps) => {
  const [isEditing, setIsEditing] = useState(false);
  if (isEditing) {
    return props.editMenu;
  }

  function onEditClick(e: React.MouseEvent) {
    setIsEditing(true);
    e.stopPropagation();
  }

  return (
    <Toolbar>
      <SimpleToolbarButton
        mainTooltip="Edit"
        isSelected={false}
        onClick={onEditClick}>
        Edit Link
      </SimpleToolbarButton>

      <ToolbarSeparator />

      <SimpleToolbarButton
        mainTooltip="Open in new tab"
        isSelected={false}
        onClick={() => {
          window.open(props.href, "_blank");
        }}
        icon={RiExternalLinkFill}
      />

      <ToolbarSeparator />

      <SimpleToolbarButton
        mainTooltip="Remove link"
        isSelected={false}
        onClick={props.removeHandler}
        icon={RiLinkUnlink}
      />
    </Toolbar>
  );
};
