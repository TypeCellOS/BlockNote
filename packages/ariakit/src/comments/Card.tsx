import { Button as AriakitButton, Group as AriakitGroup } from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Card = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Card"]
>((props, ref) => {
  const {
    className,
    children,
    selected,
    headerText,
    onFocus,
    onBlur,
    tabIndex,
    ...rest
  } = props;

  assertEmpty(rest, false);

  return (
    <AriakitGroup
      className={mergeCSSClasses(
        className,
        "bn-ak-hovercard",
        selected && "selected",
      )}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      ref={ref}
    >
      {headerText && <div className={"bn-header-text"}>{headerText}</div>}
      {children}
    </AriakitGroup>
  );
});

export const CardSection = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["CardSection"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <AriakitGroup
      className={mergeCSSClasses(className, "bn-ak-card-section")}
      ref={ref}
    >
      {children}
    </AriakitGroup>
  );
});

export const ExpandSectionsPrompt = forwardRef<
  HTMLButtonElement,
  ComponentProps["Comments"]["ExpandSectionsPrompt"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <AriakitButton
      className={mergeCSSClasses(
        className,
        "bn-ak-button bn-ak-secondary bn-ak-expand-sections-prompt",
      )}
      ref={ref}
    >
      {children}
    </AriakitButton>
  );
});
