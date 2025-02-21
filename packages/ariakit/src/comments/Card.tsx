import { Group as AriakitGroup } from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const Card = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Card"]
>((props, ref) => {
  const { className, children, onClick, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <AriakitGroup
      className={mergeCSSClasses(className, "bn-ak-hovercard")}
      onClick={onClick}
      ref={ref}>
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
      ref={ref}>
      {children}
    </AriakitGroup>
  );
});
