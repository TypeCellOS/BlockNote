import {
  Button as AriakitButton,
  Group as AriakitGroup,
  Tooltip as AriakitTooltip,
  TooltipAnchor as AriakitTooltipAnchor,
  TooltipProvider as AriakitTooltipProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

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

  const badge = (
    <AriakitButton
      className={mergeCSSClasses(
        className,
        "bn-ak-badge bn-ak-button",
        isSelected && "bn-ak-primary",
      )}
      aria-selected={isSelected === true}
      onClick={(event) => onClick?.(event)}
      onMouseEnter={onMouseEnter}
      ref={ref}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </AriakitButton>
  );

  if (!mainTooltip) {
    return badge;
  }

  return (
    <AriakitTooltipProvider>
      <AriakitTooltipAnchor render={badge} />
      <AriakitTooltip className="bn-ak-tooltip" portal={false}>
        <span>{mainTooltip}</span>
        {secondaryTooltip && <span>{secondaryTooltip}</span>}
      </AriakitTooltip>
    </AriakitTooltipProvider>
  );
});

export const BadgeGroup = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Badge"]["Group"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <AriakitGroup
      className={mergeCSSClasses(className, "bn-ak-badge-group")}
      ref={ref}
    >
      {children}
    </AriakitGroup>
  );
});
