import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const Badge = forwardRef<
  HTMLButtonElement,
  ComponentProps["Generic"]["Badge"]["Root"]
>((props, ref) => {
  const {
    className,
    text,
    icon,
    isSelected,
    mainTooltip,
    secondaryTooltip,
    onClick,
    onMouseEnter,
    ...rest
  } = props;

  assertEmpty(rest, false);

  const ShadCNComponents = useShadCNComponentsContext()!;

  const badge = (
    <ShadCNComponents.Button.Button
      variant={isSelected ? "secondary" : "outline"}
      className={cn(
        className,
        "bn-flex bn-items-center bn-gap-1 bn-rounded-full bn-h-7 bn-px-2.5",
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      ref={ref}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </ShadCNComponents.Button.Button>
  );

  if (!mainTooltip) {
    return badge;
  }

  return (
    <ShadCNComponents.Tooltip.Tooltip>
      <ShadCNComponents.Tooltip.TooltipTrigger asChild>
        {badge}
      </ShadCNComponents.Tooltip.TooltipTrigger>
      <ShadCNComponents.Tooltip.TooltipContent
        className={"bn-flex bn-flex-col bn-items-center bn-whitespace-pre-wrap"}
      >
        <span>{mainTooltip}</span>
        {secondaryTooltip && <span>{secondaryTooltip}</span>}
      </ShadCNComponents.Tooltip.TooltipContent>
    </ShadCNComponents.Tooltip.Tooltip>
  );
});

export const BadgeGroup = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Badge"]["Group"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Tooltip.TooltipProvider delayDuration={0}>
      <div
        className={cn(
          className,
          "bn-flex bn-flex-row bn-flex-wrap bn-gap-1 bn-w-full",
        )}
        ref={ref}
      >
        {children}
      </div>
    </ShadCNComponents.Tooltip.TooltipProvider>
  );
});
