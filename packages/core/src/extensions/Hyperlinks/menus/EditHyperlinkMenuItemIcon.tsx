import { IconType } from "react-icons";
import Tippy from "@tippyjs/react";
import { TooltipContent } from "../../../shared/components/tooltip/TooltipContent";

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
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Icon size={16}></Icon>
      </div>
    </Tippy>
  );
}
