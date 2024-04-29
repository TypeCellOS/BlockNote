import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const { className, children, onMouseEnter, onMouseLeave } = props;

    const ShadCNComponents = useShadCNComponentsContext()!;

    return (
      <ShadCNComponents.Tooltip.TooltipProvider delayDuration={0}>
        <div
          className={cn(
            className,
            "flex gap-1 p-1 rounded-lg bg-white shadow-[0_2px_10px] shadow-blackA4"
          )}
          ref={ref}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}>
          {children}
        </div>
      </ShadCNComponents.Tooltip.TooltipProvider>
    );
  }
);

type ToolbarButtonProps = ComponentProps["FormattingToolbar"]["Button"] &
  ComponentProps["LinkToolbar"]["Button"];

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (props, ref) => {
    const {
      className,
      children,
      mainTooltip,
      secondaryTooltip,
      icon,
      isSelected,
      isDisabled,
      onClick,
      ...rest
    } = props;

    const ShadCNComponents = useShadCNComponentsContext()!;

    const trigger =
      isSelected === undefined ? (
        <ShadCNComponents.Button.Button
          className={className}
          variant="ghost"
          size="sm"
          disabled={isDisabled}
          onClick={onClick}
          ref={ref}
          {...rest}>
          {icon}
          {children}
        </ShadCNComponents.Button.Button>
      ) : (
        <ShadCNComponents.Toggle.Toggle
          className={className}
          onClick={onClick}
          pressed={isSelected}
          disabled={isDisabled}
          data-state={isSelected ? "on" : "off"}
          data-disabled={isDisabled}
          {...rest}>
          {icon}
          {children}
        </ShadCNComponents.Toggle.Toggle>
      );

    return (
      <ShadCNComponents.Tooltip.Tooltip>
        <ShadCNComponents.Tooltip.TooltipTrigger asChild>
          {trigger}
        </ShadCNComponents.Tooltip.TooltipTrigger>
        <ShadCNComponents.Tooltip.TooltipContent>
          {mainTooltip}
        </ShadCNComponents.Tooltip.TooltipContent>
        {/* TODO: secondary tooltip */}
      </ShadCNComponents.Tooltip.Tooltip>
    );
  }
);

export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const { className, items, isDisabled } = props;

  const ShadCNComponents = useShadCNComponentsContext()!;

  // TODO?
  const SelectItemContent = (props: any) => (
    <div className={"flex gap-1 items-center"}>
      {props.icon}
      {props.text}
    </div>
  );

  const selectedItem = items.filter((p) => p.isSelected)[0];

  if (!selectedItem) {
    return null;
  }

  return (
    <ShadCNComponents.Select.Select
      value={selectedItem.text}
      onValueChange={(value) =>
        items.find((item) => item.text === value)!.onClick?.()
      }
      disabled={isDisabled}>
      <ShadCNComponents.Select.SelectTrigger className={"border-none"}>
        <ShadCNComponents.Select.SelectValue />
      </ShadCNComponents.Select.SelectTrigger>
      <ShadCNComponents.Select.SelectContent
        className={cn(
          className
          // "max-h-[var(--radix-dropdown-menu-content-available-height)]"
        )}
        // style={{
        //   maxHeight: "var(--radix-dropdown-menu-content-available-height)",
        // }}
        ref={ref}>
        {items.map((item) => (
          <ShadCNComponents.Select.SelectItem
            disabled={item.isDisabled}
            key={item.text}
            value={item.text}>
            <SelectItemContent {...item} />
          </ShadCNComponents.Select.SelectItem>
        ))}
      </ShadCNComponents.Select.SelectContent>
    </ShadCNComponents.Select.Select>
  );
});
