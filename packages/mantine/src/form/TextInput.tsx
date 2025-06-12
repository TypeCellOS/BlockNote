import { TextInput as MantineTextInput } from "@mantine/core";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
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
    variant,
    icon,
    value,
    autoFocus,
    placeholder,
    disabled,
    onKeyDown,
    onChange,
    onSubmit,
    autoComplete,
    rightSection,
    ...rest
  } = props;

  assertEmpty(rest);

  return (
    <MantineTextInput
      size={"xs"}
      className={mergeCSSClasses(
        className || "",
        variant === "large" ? "bn-mt-input-large" : ""
      )}
      ref={ref}
      name={name}
      label={label}
      leftSection={icon}
      value={value}
      autoFocus={autoFocus}
      data-autofocus={autoFocus ? "true" : undefined}
      rightSection={rightSection}
      placeholder={placeholder}
      disabled={disabled}
      onKeyDown={onKeyDown}
      onChange={onChange}
      onSubmit={onSubmit}
      autoComplete={autoComplete}
    />
  );
});
