import Tippy from "@tippyjs/react";
import { useCallback, useState } from "react";
import {
  ToolbarButton,
  ToolbarButtonProps,
} from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { EditHyperlinkMenu } from "../../HyperlinkMenus/EditHyperlinkMenu/components/EditHyperlinkMenu";

type HyperlinkButtonProps = ToolbarButtonProps & {
  hyperlinkIsActive: boolean;
  activeHyperlinkUrl: string;
  activeHyperlinkText: string;
  setHyperlink: (url: string, text?: string) => void;
};

/**
 * The link menu button opens a tooltip on click
 */
export const LinkToolbarButton = (props: HyperlinkButtonProps) => {
  const [creationMenu, setCreationMenu] = useState<any>();

  // TODO: review code; does this pattern still make sense?
  const updateCreationMenu = useCallback(() => {
    setCreationMenu(
      <EditHyperlinkMenu
        key={Math.random() + ""} // Math.random to prevent old element from being re-used
        url={props.hyperlinkIsActive ? props.activeHyperlinkUrl : ""}
        text={props.hyperlinkIsActive ? props.activeHyperlinkText : ""}
        update={props.setHyperlink}
      />
    );
  }, [props]);

  return (
    <Tippy
      content={creationMenu}
      trigger={"click"}
      onShow={(_) => {
        updateCreationMenu();
      }}
      interactive={true}
      maxWidth={500}>
      <ToolbarButton {...props} />
    </Tippy>
  );
};

export default LinkToolbarButton;
