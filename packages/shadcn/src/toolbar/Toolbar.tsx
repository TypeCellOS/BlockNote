import { ToolbarButtonProps, ToolbarSelectProps } from "@blocknote/react";
import React from "react";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Toggle } from "../components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { cn } from "../lib/utils";

export const Toolbar = React.forwardRef(
  (props: { children: React.ReactNode }, ref) => {
    return (
      <TooltipProvider delayDuration={0}>
        <div
          className="flex p-[10px] w-full min-w-max rounded-md bg-white shadow-[0_2px_10px] shadow-blackA4"
          ref={ref}
          {...props}
        />
      </TooltipProvider>
    );
  }
);

export const ToolbarButton = React.forwardRef(
  (props: ToolbarButtonProps, ref) => {
    const {
      icon,
      isDisabled,
      children,
      mainTooltip,
      secondaryTooltip,
      isSelected,
      onClick,
      ...rest
    } = props;

    const trigger =
      props.isSelected === undefined ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={isDisabled}
          onClick={onClick}
          ref={ref}
          {...rest}>
          {icon}
          {children}
        </Button>
      ) : (
        <Toggle
          onPressedChange={onClick}
          pressed={isSelected}
          disabled={isDisabled}
          ref={ref}
          data-state={isSelected ? "on" : "off"}
          data-disabled={isDisabled}
          {...rest}>
          {props.icon}
          {props.children}
        </Toggle>
      );

    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>{mainTooltip}</TooltipContent>
        {/* TODO: secondary tooltip */}
      </Tooltip>
    );
  }
);

export const ToolbarSelect = (props: ToolbarSelectProps) => {
  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={selectedItem.text} />
      </SelectTrigger>
      <SelectContent className={cn("bn-ui-container")}>
        {props.items.map((item) => (
          // TODO: item.icon
          <SelectItem
            disabled={item.isDisabled}
            key={item.text}
            value={item.text}
            onClick={() => item.onClick?.()}>
            {item.text}
            {item.icon}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
