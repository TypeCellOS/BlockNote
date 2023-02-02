import Tippy from "@tippyjs/react";
import { useCallback, useEffect, useRef, useState } from "react";
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

  const ref = useRef<HTMLButtonElement>(null);

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

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (ref.current?.contains(event.target as HTMLElement)) {
        setCreationMenuOpen(!creationMenuOpen);
        return;
      }

      setCreationMenuOpen(false);
    },
    [creationMenuOpen]
  );

  useEffect(() => {
    document.body.addEventListener("click", handleClick);
    return () => document.body.removeEventListener("click", handleClick);
  }, [handleClick]);

  return (
    <Tippy
      appendTo={document.body}
      content={creationMenu}
      onShow={updateCreationMenu}
      interactive={true}
      maxWidth={500}
      visible={creationMenuOpen}>
      <ToolbarButton
        isSelected={props.isSelected}
        mainTooltip={props.mainTooltip}
        secondaryTooltip={props.secondaryTooltip}
        icon={props.icon}
        ref={ref}
      />
    </Tippy>
  );
};

export default LinkToolbarButton;
