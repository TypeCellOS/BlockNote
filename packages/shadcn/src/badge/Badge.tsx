import { assertEmpty } from "@blocknote/core";
import { ComponentProps, usePortalElement } from "@blocknote/react";
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

  // Portal the tooltip into the ambient portal target (a themed `.bn-root`)
  // so it inherits the editor's light/dark color scheme instead of the
  // document body's.
  // NOTE: Only ShadCN Badge / Tooltip depend on usePortalElement.
  // Alternative would be to pass a portalElement to these components, but they
  // would be ignored by ariakit / mantine. For now keep these two exceptions
  // (ideally skin components don't have a dependency on the editor's context)
  const portalElement = usePortalElement();

  const badge = (
    <ShadCNComponents.Button.Button
      variant={isSelected ? "secondary" : "outline"}
      className={cn(
        className,
        "flex h-7 items-center gap-1 rounded-full px-2.5",
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
      <ShadCNComponents.Tooltip.TooltipTrigger render={badge} />
      <ShadCNComponents.Tooltip.TooltipContent
        container={portalElement ?? undefined}
        className={"flex flex-col items-center whitespace-pre-wrap"}
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
    <ShadCNComponents.Tooltip.TooltipProvider delay={0}>
      <div
        className={cn(className, "flex w-full flex-row flex-wrap gap-1")}
        ref={ref}
      >
        {children}
      </div>
    </ShadCNComponents.Tooltip.TooltipProvider>
  );
});
