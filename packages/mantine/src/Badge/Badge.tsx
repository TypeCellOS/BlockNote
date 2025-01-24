import { forwardRef } from "react";
import { ComponentProps } from "@blocknote/react";
import { Chip, Group } from "@mantine/core";
import { assertEmpty } from "@blocknote/core";

export const Badge = forwardRef<
  HTMLInputElement,
  ComponentProps["Generic"]["Badge"]["Root"]
>((props, ref) => {
  const { className, text, icon, isSelected, onClick, ...rest } = props;

  assertEmpty(rest);

  return (
    <Chip
      className={className}
      checked={isSelected === true}
      onClick={onClick}
      variant={"light"}
      ref={ref}>
      <span>{icon}</span>
      <span>{text}</span>
    </Chip>
  );
});

export const BadgeGroup = forwardRef<
  HTMLDivElement,
  ComponentProps["Generic"]["Badge"]["Group"]
>((props, ref) => {
  const { className, children, ...rest } = props;

  assertEmpty(rest);

  return (
    <Group className={className} ref={ref}>
      {children}
    </Group>
  );
});
