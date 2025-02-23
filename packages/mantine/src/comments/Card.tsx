import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { Card as MantineCard } from "@mantine/core";
import { forwardRef } from "react";

export const Card = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Card"]
>((props, ref) => {
  const { className, children, onClick, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <MantineCard
      p={"md"}
      onClick={onClick}
      {...rest}
      className={className}
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
