import { IconType } from "react-icons";
import Tippy from "@tippyjs/react";
import { TooltipContent } from "../../../shared/components/tooltip/TooltipContent";

export type IconWithTooltipProps = {
  icon: IconType;
  mainTooltip: string;
  secondaryTooltip?: string;
};

export function HyperlinkMenuIcon(props: IconWithTooltipProps) {
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
      <div style={{ display: "flex", justifyContent: "center", flexGrow: 0 }}>
        <Icon size={16}></Icon>
      </div>
    </Tippy>
  );
}
