import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const TextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["Generic"]["Form"]["TextInput"]
>((props, ref) => {
  const {
    className,
    name,
    label,
    icon,
    value,
    autoFocus,
    placeholder,
    onKeyDown,
    onChange,
    onSubmit,
  } = props;

  return (
    <Mantine.TextInput
      size={"xs"}
      className={className}
      ref={ref}
      name={name}
      label={label}
      leftSection={icon}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={onChange}
      onSubmit={onSubmit}
    />
  );
});
