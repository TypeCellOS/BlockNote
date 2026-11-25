import {
  Chip as MantineChip,
  Group as MantineGroup,
  Tooltip as MantineTooltip,
} from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { HTMLAttributes, MouseEvent, forwardRef, useState } from "react";

import { TooltipContent } from "../toolbar/ToolbarButton.js";

export const Badge = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Badge"]["Root"] &
    Omit<HTMLAttributes<HTMLInputElement>, "onChange">
>((props, ref) => {
  const {
    className,
    text,
    icon,
    isSelected,
    mainTooltip,
    label,
    secondaryTooltip,
    onClick,
    onMouseEnter,
    ...rest
  } = props;

  const [hideTooltip, setHideTooltip] = useState(false);

  const badge = (
    <MantineChip
      className={className}
      checked={isSelected === true}
      wrapperProps={{
        onMouseEnter,
        onMouseLeave: () => setHideTooltip(false),
        onClick: (event: MouseEvent) => {
          setHideTooltip(true);
          onClick?.(event);
        },
      }}
      variant={"light"}
      icon={null}
      // The popover target must include the visible label, not just the input.
      rootRef={ref}
      aria-label={label}
      {...rest}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </MantineChip>
  );

  if (!mainTooltip || hideTooltip) {
    return badge;
  }

  return (
    <MantineTooltip
      refProp="rootRef"
      withinPortal={false}
      label={
        <TooltipContent
          mainTooltip={mainTooltip}
          secondaryTooltip={secondaryTooltip}
        />
      }
    >
      {badge}
    </MantineTooltip>
  );
});

export const BadgeGroup = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Badge"]["Group"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <MantineGroup className={className} ref={ref}>
      {children}
    </MantineGroup>
  );
});
