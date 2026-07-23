import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useBlockNoteEditor } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

type ToolbarProps = ComponentProps["Generic"]["Toolbar"]["Root"];

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, ref) => {
    const {
      className,
      children,
      onMouseEnter,
      onMouseLeave,
      variant,
      ...rest
    } = props;

    assertEmpty(rest);

    const ShadCNComponents = useShadCNComponentsContext()!;

    return (
      <ShadCNComponents.Tooltip.TooltipProvider delay={0}>
        <div
          className={cn(
            className,
            "bg-popover text-popover-foreground flex h-fit gap-1 rounded-lg border p-1 shadow-md",
            variant === "action-toolbar" ? "w-fit" : "",
          )}
          ref={ref}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {children}
        </div>
      </ShadCNComponents.Tooltip.TooltipProvider>
    );
  },
);

type ToolbarButtonProps = ComponentProps["Generic"]["Toolbar"]["Button"];

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
      variant,
      ...rest
    } = props;

    // false, because rest props can be added by shadcn when button is used as a trigger
    // assertEmpty in this case is only used at typescript level, not runtime level
    assertEmpty(rest, false);

    const ShadCNComponents = useShadCNComponentsContext()!;

    // Portal the tooltip into the editor's portal element so it inherits the
    // editor's light/dark color scheme instead of the document body's.
    const editor = useBlockNoteEditor();

    const trigger =
      isSelected === undefined ? (
        <ShadCNComponents.Button.Button
          className={cn(
            className,
            variant === "compact" ? "h-6 min-w-6 p-0" : "",
          )}
          variant="ghost"
          size={variant === "compact" ? "sm" : "default"}
          disabled={isDisabled}
          onClick={onClick}
          ref={ref}
          aria-label={label}
          {...rest}
        >
          {icon}
          {children}
        </ShadCNComponents.Button.Button>
      ) : (
        <ShadCNComponents.Toggle.Toggle
          className={cn(
            className,
            "aria-expanded:bg-accent aria-expanded:text-accent-foreground",
            variant === "compact" ? "h-6 min-w-6 p-0" : "",
          )}
          size={variant === "compact" ? "sm" : "default"}
          aria-label={label}
          onClick={onClick}
          pressed={isSelected}
          disabled={isDisabled}
          ref={ref}
          {...rest}
        >
          {icon}
          {children}
        </ShadCNComponents.Toggle.Toggle>
      );

    return (
      <ShadCNComponents.Tooltip.Tooltip>
        <ShadCNComponents.Tooltip.TooltipTrigger render={trigger} />
        <ShadCNComponents.Tooltip.TooltipContent
          container={editor.portalElement}
          className={"flex flex-col items-center whitespace-pre-wrap"}
        >
          <span>{mainTooltip}</span>
          {secondaryTooltip && <span>{secondaryTooltip}</span>}
        </ShadCNComponents.Tooltip.TooltipContent>
      </ShadCNComponents.Tooltip.Tooltip>
    );
  },
);

export const ToolbarSelect = forwardRef<
  HTMLDivElement,
  ComponentProps["FormattingToolbar"]["Select"]
>((props, ref) => {
  const { className, items, isDisabled, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  // Portal into the editor's portal element (which carries the color-scheme
  // class) so the dropdown inherits light/dark mode instead of the body's.
  const editor = useBlockNoteEditor();

  // TODO?
  const SelectItemContent = (props: any) => (
    <div className={"flex items-center gap-1"}>
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
      disabled={isDisabled}
    >
      <ShadCNComponents.Select.SelectTrigger className={"border-none"}>
        <ShadCNComponents.Select.SelectValue />
      </ShadCNComponents.Select.SelectTrigger>
      <ShadCNComponents.Select.SelectContent
        className={className}
        container={editor.portalElement}
        // Position the dropdown below the trigger (classic dropdown behavior)
        // instead of aligning the selected item over the trigger (the Base UI
        // default).
        alignItemWithTrigger={false}
        ref={ref}
      >
        {items.map((item) => (
          <ShadCNComponents.Select.SelectItem
            disabled={item.isDisabled}
            key={item.text}
            value={item.text}
          >
            <SelectItemContent {...item} />
          </ShadCNComponents.Select.SelectItem>
        ))}
      </ShadCNComponents.Select.SelectContent>
    </ShadCNComponents.Select.Select>
  );
});
