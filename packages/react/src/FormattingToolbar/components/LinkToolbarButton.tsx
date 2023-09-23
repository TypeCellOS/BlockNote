import Tippy from "@tippyjs/react";
import { useCallback, useState } from "react";
import {
  ToolbarButton,
  ToolbarButtonProps,
} from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { EditHyperlinkMenu } from "../../HyperlinkToolbar/EditHyperlinkMenu/components/EditHyperlinkMenu";

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
  const [creationMenuOpen, setCreationMenuOpen] = useState(false);

  // TODO: review code; does this pattern still make sense?
  const updateCreationMenu = useCallback(() => {
    setCreationMenu(
      <EditHyperlinkMenu
        key={Math.random() + ""} // Math.random to prevent old element from being re-used
        url={props.activeHyperlinkUrl}
        text={props.activeHyperlinkText}
        update={(url, text) => {
          props.setHyperlink(url, text);
          setCreationMenuOpen(false);
        }}
      />
    );
  }, [props]);
  const handleHide = () => {
    setCreationMenuOpen(false);
  };
  const handleClick = () => {
    setCreationMenuOpen(!creationMenuOpen);
  };

  return (
    <Tippy
      content={creationMenu}
      onShow={updateCreationMenu}
      onHide={handleHide}
      interactive={true}
      maxWidth={500}
      visible={creationMenuOpen}>
      <ToolbarButton
        onClick={handleClick}
        isSelected={props.isSelected}
        mainTooltip={props.mainTooltip}
        secondaryTooltip={props.secondaryTooltip}
        icon={props.icon}
      />
    </Tippy>
  );
};

export default LinkToolbarButton;
