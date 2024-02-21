import { useRef, useState } from "react";
import { RiExternalLinkFill, RiLinkUnlink } from "react-icons/ri";

import { HyperlinkToolbarProps } from "../HyperlinkToolbarProps";
import { EditHyperlinkMenu } from "./EditHyperlinkMenu/EditHyperlinkMenu";
import { Toolbar } from "../../mantine-shared/Toolbar/Toolbar";
import { ToolbarButton } from "../../mantine-shared/Toolbar/ToolbarButton";

export const HyperlinkToolbar = (props: HyperlinkToolbarProps) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const editMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    text,
    url,
    deleteHyperlink,
    editHyperlink,
    startHideTimer,
    stopHideTimer,
  } = props;

  if (isEditing) {
    return (
      <EditHyperlinkMenu
        url={url}
        text={text}
        update={editHyperlink}
        // TODO: Better way of waiting for fade out
        onBlur={(event) =>
          setTimeout(() => {
            if (editMenuRef.current?.contains(event.relatedTarget)) {
              return;
            }
            setIsEditing(false);
          }, 500)
        }
        ref={editMenuRef}
      />
    );
  }

  return (
    <Toolbar onMouseEnter={stopHideTimer} onMouseLeave={startHideTimer}>
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
          window.open(url, "_blank");
        }}
        icon={RiExternalLinkFill}
      />
      <ToolbarButton
        mainTooltip="Remove link"
        isSelected={false}
        onClick={deleteHyperlink}
        icon={RiLinkUnlink}
      />
    </Toolbar>
  );
};
