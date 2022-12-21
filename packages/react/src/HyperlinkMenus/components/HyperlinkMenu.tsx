import { useState } from "react";
import { EditHyperlinkMenu } from "../EditHyperlinkMenu/components/EditHyperlinkMenu";
import { HoverHyperlinkMenu } from "../HoverHyperlinkMenu/components/HoverHyperlinkMenu";
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

  const editHyperlinkMenu = (
    <EditHyperlinkMenu
      url={props.url}
      text={props.text}
      update={props.update}
    />
  );

  const hoverHyperlinkMenu = (
    <HoverHyperlinkMenu
      url={props.url}
      edit={() => setIsEditing(true)}
      remove={props.remove}
    />
  );

  if (isEditing) {
    return editHyperlinkMenu;
  } else {
    return hoverHyperlinkMenu;
  }
};
