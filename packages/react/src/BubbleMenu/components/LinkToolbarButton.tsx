import Tippy from "@tippyjs/react";
import { useCallback, useState } from "react";
import {
  ToolbarButton,
  ToolbarButtonProps,
} from "../../shared/components/toolbar/ToolbarButton";
import { EditHyperlinkMenu } from "../../HyperlinkMenus/EditHyperlinkMenu/components/EditHyperlinkMenu";
import { HyperlinkMarkProps } from "../../../../core/src/menu-tools/BubbleMenu/types";

type Props = ToolbarButtonProps & {
  hyperlinkMarkProps: HyperlinkMarkProps;
};

/**
 * The link menu button opens a tooltip on click
 */
export const LinkToolbarButton = (props: Props) => {
  const [creationMenu, setCreationMenu] = useState<any>();

  // TODO: review code; does this pattern still make sense?
  const updateCreationMenu = useCallback(() => {
    setCreationMenu(
      <EditHyperlinkMenu
        key={Math.random() + ""} // Math.random to prevent old element from being re-used
        url={
          props.hyperlinkMarkProps.isActive ? props.hyperlinkMarkProps.url : ""
        }
        text={
          props.hyperlinkMarkProps.isActive ? props.hyperlinkMarkProps.text : ""
        }
        update={props.hyperlinkMarkProps.set}
      />
    );
  }, [props.hyperlinkMarkProps]);

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
