import { useState } from "react";
import Tippy from "@tippyjs/react";
import { EditHyperlinkMenu } from "./EditHyperlinkMenu";
import { HoverHyperlinkMenu } from "./HoverHyperlinkMenu";
import rootStyles from "../../../root.module.css";

type HyperlinkMenuProps = {
  url: string;
  text: string;
  pos: {
    height: number;
    width: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
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
    <Tippy
      getReferenceClientRect={() => props.pos as any}
      content={
        <EditHyperlinkMenu
          url={props.url}
          text={props.text}
          update={props.update}
        />
      }
      interactive={true}
      interactiveBorder={30}
      showOnCreate={true}
      trigger={"click"} // so that we don't hide on mouse out
      hideOnClick
      className={rootStyles.bnRoot}
      appendTo={document.body}>
      <div></div>
    </Tippy>
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
