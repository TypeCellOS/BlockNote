import { TextInput as MantineTextInput } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
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
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <MantineTextInput
      size={"xs"}
      className={className}
      ref={ref}
      name={name}
      label={label}
      leftSection={icon}
      value={value}
      autoFocus={autoFocus}
      data-autofocus={autoFocus ? "true" : undefined}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={onChange}
      onSubmit={onSubmit}
    />
  );
});
