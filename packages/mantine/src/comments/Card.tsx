import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import {
  Card as MantineCard,
  Divider as MantineDivider,
  Text as MantineText,
} from "@mantine/core";
import { forwardRef } from "react";

export const Card = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["Card"]
>((props, ref) => {
  const {
    className,
    children,
    headerText,
    selected,
    onFocus,
    onBlur,
    tabIndex,
    ...rest
  } = props;

  assertEmpty(rest, false);

  return (
    <MantineCard
      className={mergeCSSClasses(className, selected ? "selected" : "")}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      ref={ref}
    >
      {headerText && (
        <MantineText className={"bn-header-text"}>{headerText}</MantineText>
      )}
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
    <MantineCard.Section className={className} ref={ref}>
      {children}
    </MantineCard.Section>
  );
});

export const ExpandSectionsPrompt = forwardRef<
  HTMLDivElement,
  ComponentProps["Comments"]["ExpandSectionsPrompt"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest, false);

  return (
    <MantineDivider
      className={className}
      label={<MantineText>{children}</MantineText>}
      ref={ref}
    />
  );
});
