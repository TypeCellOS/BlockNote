import { ComponentProps } from "@blocknote/react";
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
import { forwardRef } from "react";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = (props: ToolbarProps) => {
  const { className, children, ...rest } = props;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          className,
          "flex p-[10px] w-full min-w-max rounded-md bg-white shadow-[0_2px_10px] shadow-blackA4"
        )}
        {...rest}>
        {children}
      </div>
    </TooltipProvider>
  );
};

type ToolbarButtonProps = ComponentProps["FormattingToolbar"]["Button"] &
  ComponentProps["LinkToolbar"]["Button"];

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (props, ref) => {
    const trigger =
      props.isSelected === undefined ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={props.isDisabled}
          onClick={props.onClick}
          ref={ref}>
          {props.icon}
          {props.children}
        </Button>
      ) : (
        <Toggle
          onClick={props.onClick}
          pressed={props.isSelected}
          disabled={props.isDisabled}
          data-state={props.isSelected ? "on" : "off"}
          data-disabled={props.isDisabled}
          ref={ref}>
          {props.icon}
          {props.children}
        </Toggle>
      );

    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>{props.mainTooltip}</TooltipContent>
        {/* TODO: secondary tooltip */}
      </Tooltip>
    );
  }
);

export const ToolbarSelect = (
  props: ComponentProps["FormattingToolbar"]["Select"]
) => {
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
