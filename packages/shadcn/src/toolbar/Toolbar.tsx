import * as ShadCNButton from "../components/ui/button";
import * as ShadCNSelect from "../components/ui/select";
import * as ShadCNToggle from "../components/ui/toggle";
import * as ShadCNTooltip from "../components/ui/tooltip";

import { ComponentProps } from "@blocknote/react";
import { ComponentType, forwardRef } from "react";

import { cn } from "../lib/utils";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = (
  props: ToolbarProps &
    Partial<{
      TooltipProvider: typeof ShadCNTooltip.TooltipProvider;
    }>
) => {
  const { className, children, onMouseEnter, onMouseLeave } = props;

  const TooltipProvider =
    props.TooltipProvider || ShadCNTooltip.TooltipProvider;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          className,
          "flex p-[10px] rounded-md bg-white shadow-[0_2px_10px] shadow-blackA4"
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}>
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
  const {
    className,
    children,
    mainTooltip,
    // secondaryTooltip,
    icon,
    isSelected,
    isDisabled,
    onClick,
  } = props;

  const Button = props.Button || ShadCNButton.Button;
  const Toggle = props.Toggle || ShadCNToggle.Toggle;
  const Tooltip = props.Tooltip || ShadCNTooltip.Tooltip;
  const TooltipContent = props.TooltipContent || ShadCNTooltip.TooltipContent;
  const TooltipTrigger = props.TooltipTrigger || ShadCNTooltip.TooltipTrigger;

  const trigger =
    isSelected === undefined ? (
      <Button
        className={className}
        variant="ghost"
        size="sm"
        disabled={isDisabled}
        onClick={onClick}
        ref={ref}>
        {icon}
        {children}
      </Button>
    ) : (
      <Toggle
        className={className}
        onClick={onClick}
        pressed={isSelected}
        disabled={isDisabled}
        data-state={isSelected ? "on" : "off"}
        data-disabled={isDisabled}
        ref={ref}>
        {icon}
        {children}
      </Toggle>
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>{mainTooltip}</TooltipContent>
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
  const { className, items, isDisabled } = props;

  const Select = props.Select || ShadCNSelect.Select;
  const SelectContent = props.SelectContent || ShadCNSelect.SelectContent;
  const SelectItem = props.SelectItem || ShadCNSelect.SelectItem;
  const SelectTrigger = props.SelectTrigger || ShadCNSelect.SelectTrigger;
  const SelectValue = props.SelectValue || ShadCNSelect.SelectValue;

  const { SelectItemContent } = props;

  const selectedItem = items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <Select
      value={selectedItem.text}
      onValueChange={(value) =>
        items.find((item) => item.text === value)!.onClick?.()
      }
      disabled={isDisabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={className}>
        {items.map((item) => (
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
