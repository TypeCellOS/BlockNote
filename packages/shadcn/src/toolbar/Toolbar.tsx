import { ComponentProps } from "@blocknote/react";
import * as ShadCNButton from "../components/ui/button";
import * as ShadCNSelect from "../components/ui/select";
import * as ShadCNToggle from "../components/ui/toggle";
import * as ShadCNTooltip from "../components/ui/tooltip";
import { cn } from "../lib/utils";
import { ComponentType, forwardRef } from "react";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = (
  props: ToolbarProps &
    Partial<{
      TooltipProvider: typeof ShadCNTooltip.TooltipProvider;
    }>
) => {
  const TooltipProvider =
    props.TooltipProvider || ShadCNTooltip.TooltipProvider;

  const { className, children, ...rest } = props;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          className,
          "flex p-[10px] rounded-md bg-white shadow-[0_2px_10px] shadow-blackA4"
        )}
        {...rest}>
        {children}
      </div>
    </TooltipProvider>
  );
};

type ToolbarButtonProps = ComponentProps["FormattingToolbar"]["Button"] &
  ComponentProps["LinkToolbar"]["Button"];

export const ToolbarButton = forwardRef<
  HTMLButtonElement,
  ToolbarButtonProps &
    Partial<{
      Button: typeof ShadCNButton.Button;
      Toggle: typeof ShadCNToggle.Toggle;
      Tooltip: typeof ShadCNTooltip.Tooltip;
      TooltipContent: typeof ShadCNTooltip.TooltipContent;
      TooltipTrigger: typeof ShadCNTooltip.TooltipTrigger;
    }>
>((props, ref) => {
  const Button = props.Button || ShadCNButton.Button;
  const Toggle = props.Toggle || ShadCNToggle.Toggle;
  const Tooltip = props.Tooltip || ShadCNTooltip.Tooltip;
  const TooltipContent = props.TooltipContent || ShadCNTooltip.TooltipContent;
  const TooltipTrigger = props.TooltipTrigger || ShadCNTooltip.TooltipTrigger;

  const trigger =
    props.isSelected === undefined ? (
      <Button
        variant="ghost"
        size="sm"
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
});

export const ToolbarSelect = (
  props: ComponentProps["FormattingToolbar"]["Select"] &
    Partial<{
      Select: typeof ShadCNSelect.Select;
      SelectContent: typeof ShadCNSelect.SelectContent;
      SelectItem: typeof ShadCNSelect.SelectItem;
      SelectItemContent: ComponentType<(typeof props.items)[number]>;
      SelectTrigger: typeof ShadCNSelect.SelectTrigger;
      SelectValue: typeof ShadCNSelect.SelectValue;
    }>
) => {
  const Select = props.Select || ShadCNSelect.Select;
  const SelectContent = props.SelectContent || ShadCNSelect.SelectContent;
  const SelectItem = props.SelectItem || ShadCNSelect.SelectItem;
  const SelectTrigger = props.SelectTrigger || ShadCNSelect.SelectTrigger;
  const SelectValue = props.SelectValue || ShadCNSelect.SelectValue;

  const { SelectItemContent } = props;

  const selectedItem = props.items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <Select
      value={selectedItem.text}
      onValueChange={(value) =>
        props.items.find((item) => item.text === value)!.onClick?.()
      }>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {props.items.map((item) => (
          <SelectItem
            disabled={item.isDisabled}
            key={item.text}
            value={item.text}>
            {SelectItemContent ? (
              <SelectItemContent {...item} />
            ) : (
              <div className={"flex items-center"}>
                {item.icon}
                {item.text}
              </div>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
