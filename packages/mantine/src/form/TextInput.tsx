import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const TextInput = (
  props: ComponentProps["Generic"]["Form"]["TextInput"]
) => {
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
};
