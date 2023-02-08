import { IconType } from "react-icons";
import Tippy from "@tippyjs/react";
import { TooltipContent } from "../../../SharedComponents/Tooltip/components/TooltipContent";
import { Container } from "@mantine/core";

export type EditHyperlinkMenuItemIconProps = {
  icon: IconType;
  mainTooltip: string;
  secondaryTooltip?: string;
};

export function EditHyperlinkMenuItemIcon(
  props: EditHyperlinkMenuItemIconProps
) {
  const Icon = props.icon;

  return (
    <Tippy
      content={
        <TooltipContent
          mainTooltip={props.mainTooltip}
          secondaryTooltip={props.secondaryTooltip}
        />
      }
      placement="left">
      <Container>
        <Icon size={16}></Icon>
      </Container>
    </Tippy>
  );
}
