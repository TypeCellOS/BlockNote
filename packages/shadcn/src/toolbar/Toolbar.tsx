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
      ...rest
    } = props;

    // TODO: rest.isSelected?
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isDisabled}
            ref={ref}
            {...rest}>
            {icon}
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{mainTooltip}</TooltipContent>
        {/* TODO: secondary tooltip */}
      </Tooltip>
    );
  }
);

export const ToolbarSelect = (props: ToolbarSelectProps) => {
  // TODO
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent className={cn("bn-ui-container", props.className)}>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  );
};
