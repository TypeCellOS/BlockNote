import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { Card as MantineCard } from "@mantine/core";
import { forwardRef } from "react";

export const Card = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Card"]
>((props, ref) => {
  const { className, children, onFocus, onBlur, tabIndex, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <MantineCard
      className={className}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      ref={ref}>
      {children}
    </MantineCard>
  );
});

export const CardSection = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["CardSection"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <MantineCard.Section p={"md"} className={className} ref={ref}>
      {children}
    </MantineCard.Section>
  );
});
