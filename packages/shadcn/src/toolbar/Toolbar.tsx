import { assertEmpty } from "@blocknote/core";
import {
  ComponentProps,
  preventFocusOnTap,
  usePortalElement,
} from "@blocknote/react";
import { forwardRef, type MouseEvent } from "react";

import { preventFocusOnOpenProps } from "../lib/preventFocusOnOpen.js";
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

    // Portal the tooltip into the ambient portal target (a themed `.bn-root`)
    // so it inherits the editor's light/dark color scheme instead of the
    // document body's.
    // NOTE: Only ShadCN Badge / Tooltip depend on usePortalElement.
    // Alternative would be to pass a portalElement to these components, but they
    // would be ignored by ariakit / mantine. For now keep these two exceptions
    // (ideally skin components don't have a dependency on the editor's context)

    const portalElement = usePortalElement();

    const triggerMouseDown = (
      rest as { onMouseDown?: (e: MouseEvent<HTMLButtonElement>) => void }
    ).onMouseDown;
    const onMouseDown = (e: MouseEvent<HTMLButtonElement>) => {
      preventFocusOnTap(e);
      triggerMouseDown?.(e);
    };

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
          // `rest` first, so a library-injected `onMouseDown` does not replace ours.
          {...rest}
          onMouseDown={onMouseDown}
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
          // `rest` first, so a library-injected `onMouseDown` does not replace ours.
          {...rest}
          onMouseDown={onMouseDown}
        >
          {icon}
          {children}
        </ShadCNComponents.Toggle.Toggle>
      );

    return (
      <ShadCNComponents.Tooltip.Tooltip>
        <ShadCNComponents.Tooltip.TooltipTrigger render={trigger} />
        <ShadCNComponents.Tooltip.TooltipContent
          container={portalElement}
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
  const {
    className,
    items,
    isDisabled,
    portalElement,
    // Base UI has no `initialFocus` on Select; see lib/preventFocusOnOpen.ts.
    preventFocusOnOpen,
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

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
      <ShadCNComponents.Select.SelectTrigger
        className={"border-none"}
        // How-to-test: without it, tapping the block type select focuses the button and closes the keyboard (covered by skinFocus, android, shadcn: "opening the block type select keeps focus in the editor").
        onMouseDown={preventFocusOnTap}
      >
        <ShadCNComponents.Select.SelectValue />
      </ShadCNComponents.Select.SelectTrigger>
      <ShadCNComponents.Select.SelectContent
        className={className}
        container={portalElement}
        // Position the dropdown below the trigger (classic dropdown behavior)
        // instead of aligning the selected item over the trigger (the Base UI
        // default).
        alignItemWithTrigger={false}
        ref={ref}
        // How-to-test: without it, opening the block type select focuses the listbox and closes the keyboard (covered by skinFocus, android, shadcn: "opening the block type select keeps focus in the editor").
        {...preventFocusOnOpenProps(preventFocusOnOpen ?? false)}
      >
        {items.map((item) => (
          <ShadCNComponents.Select.SelectItem
            disabled={item.isDisabled}
            key={item.text}
            value={item.text}
            // How-to-test: without it, tapping a block type focuses the option and closes the keyboard (covered by skinFocus, android, shadcn: "picking from the block type select leaves focus in the editor").
            onMouseDown={preventFocusOnTap}
          >
            <SelectItemContent {...item} />
          </ShadCNComponents.Select.SelectItem>
        ))}
      </ShadCNComponents.Select.SelectContent>
    </ShadCNComponents.Select.Select>
  );
});
