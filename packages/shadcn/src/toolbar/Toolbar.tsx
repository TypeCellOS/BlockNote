import * as ShadCNButton from "../components/ui/button";
import * as ShadCNSelect from "../components/ui/select";
import * as ShadCNToggle from "../components/ui/toggle";
import * as ShadCNTooltip from "../components/ui/tooltip";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const { className, children, onMouseEnter, onMouseLeave } = props;

    const ShadCNComponents = useShadCNComponentsContext();
    const TooltipProvider =
      ShadCNComponents?.TooltipProvider || ShadCNTooltip.TooltipProvider;

    return (
      <TooltipProvider delayDuration={0}>
        <div
          className={cn(
            className,
            "flex p-[10px] rounded-md bg-white shadow-[0_2px_10px] shadow-blackA4"
          )}
          ref={ref}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}>
          {children}
        </div>
      </TooltipProvider>
    );
  }
);

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

  const ShadCNComponents = useShadCNComponentsContext();
  const Button = ShadCNComponents?.Button || ShadCNButton.Button;
  const Toggle = ShadCNComponents?.Toggle || ShadCNToggle.Toggle;
  const Tooltip = ShadCNComponents?.Tooltip || ShadCNTooltip.Tooltip;
  const TooltipContent =
    ShadCNComponents?.TooltipContent || ShadCNTooltip.TooltipContent;
  const TooltipTrigger =
    ShadCNComponents?.TooltipTrigger || ShadCNTooltip.TooltipTrigger;

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

export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const { className, items, isDisabled } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const Select = ShadCNComponents?.Select || ShadCNSelect.Select;
  const SelectContent =
    ShadCNComponents?.SelectContent || ShadCNSelect.SelectContent;
  const SelectItem = ShadCNComponents?.SelectItem || ShadCNSelect.SelectItem;
  const SelectTrigger =
    ShadCNComponents?.SelectTrigger || ShadCNSelect.SelectTrigger;
  const SelectValue = ShadCNComponents?.SelectValue || ShadCNSelect.SelectValue;
  const SelectItemContent =
    ShadCNComponents?.SelectItemContent ||
    ((props) => (
      <div className={"flex items-center"}>
        {props.icon}
        {props.text}
      </div>
    ));

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
      <SelectContent
        className={cn(
          className
          // "max-h-[var(--radix-dropdown-menu-content-available-height)]"
        )}
        // style={{
        //   maxHeight: "var(--radix-dropdown-menu-content-available-height)",
        // }}
        ref={ref}>
        {items.map((item) => (
          <SelectItem
            disabled={item.isDisabled}
            key={item.text}
            value={item.text}>
            <SelectItemContent {...item} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
