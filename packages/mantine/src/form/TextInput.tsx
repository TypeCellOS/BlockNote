import { TextInput as MantineTextInput } from "@mantine/core";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps, useMergeRefs, useAutoFocus } from "@blocknote/react";
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
    autoComplete,
    "aria-activedescendant": ariaActivedescendant,
    rightSection,
    ...rest
  } = props;

  assertEmpty(rest);

  // Rationale (and the trap contract `data-autofocus` serves) in the hook.

  const inputRef = useAutoFocus<HTMLInputElement>(autoFocus);
  const setRefs = useMergeRefs([inputRef, ref]);

  return (
    <MantineTextInput
      size={"xs"}
      className={mergeCSSClasses(
        className || "",
        variant === "large" ? "bn-mt-input-large" : "",
      )}
      ref={setRefs}
      name={name}
      label={label}
      leftSection={icon}
      value={value}
      data-autofocus={autoFocus ? "true" : undefined}
      rightSection={rightSection}
      placeholder={placeholder}
      disabled={disabled}
      onKeyDown={onKeyDown}
      onChange={onChange}
      autoComplete={autoComplete}
      aria-activedescendant={ariaActivedescendant}
    />
  );
});
