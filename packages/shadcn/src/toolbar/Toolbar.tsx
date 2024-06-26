import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

type ToolbarProps = ComponentProps["FormattingToolbar"]["Root"] &
  ComponentProps["LinkToolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const { className, children, onMouseEnter, onMouseLeave, ...rest } = props;

    assertEmpty(rest);

    const ShadCNComponents = useShadCNComponentsContext()!;

    return (
      <ShadCNComponents.Tooltip.TooltipProvider delayDuration={0}>
        <div
          className={cn(
            className,
            "bn-flex bn-gap-1 bn-p-1 bn-bg-popover bn-text-popover-foreground bn-border bn-rounded-lg bn-shadow-md"
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
      label,
      ...rest
    } = props;

    // false, because rest props can be added by shadcn when button is used as a trigger
    // assertEmpty in this case is only used at typescript level, not runtime level
    assertEmpty(rest, false);

    const ShadCNComponents = useShadCNComponentsContext()!;

    const trigger =
      isSelected === undefined ? (
        <ShadCNComponents.Button.Button
          className={className}
          variant="ghost"
          disabled={isDisabled}
          onClick={onClick}
          ref={ref}
          aria-label={label}
          {...rest}>
          {icon}
          {children}
        </ShadCNComponents.Button.Button>
      ) : (
        <ShadCNComponents.Toggle.Toggle
          className={cn(
            className,
            "data-[state=open]:bg-accent data-[state=closed]:text-accent-foreground"
          )}
          aria-label={label}
          onClick={onClick}
          pressed={isSelected}
          disabled={isDisabled}
          data-state={isSelected ? "on" : "off"}
          data-disabled={isDisabled}
          ref={ref}
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
        <ShadCNComponents.Tooltip.TooltipContent
          className={"bn-flex bn-flex-col bn-items-center"}>
          <span>{mainTooltip}</span>
          {secondaryTooltip && <span>{secondaryTooltip}</span>}
        </ShadCNComponents.Tooltip.TooltipContent>
      </ShadCNComponents.Tooltip.Tooltip>
    );
  }
);

export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const { className, items, isDisabled, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  // TODO?
  const SelectItemContent = (props: any) => (
    <div className={"bn-flex bn-gap-1 bn-items-center"}>
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
      <ShadCNComponents.Select.SelectTrigger className={"bn-border-none"}>
        <ShadCNComponents.Select.SelectValue />
      </ShadCNComponents.Select.SelectTrigger>
      <ShadCNComponents.Select.SelectContent className={className} ref={ref}>
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
