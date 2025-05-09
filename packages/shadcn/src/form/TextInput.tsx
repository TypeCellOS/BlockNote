import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const TextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["Generic"]["Form"]["TextInput"]
>((props, ref) => {
  const {
    className,
    name,
    label,
    variant,
    icon, // TODO: implement
    value,
    autoFocus,
    placeholder,
    disabled,
    onKeyDown,
    onChange,
    onSubmit,
    autoComplete,
    rightSection, // TODO: add rightSection
    ...rest
  } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  if (!label) {
    return (
      <ShadCNComponents.Input.Input
        aria-label={name}
        name={name}
        autoFocus={autoFocus}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onKeyDown={onKeyDown}
        onChange={onChange}
        onSubmit={onSubmit}
        autoComplete={autoComplete}
        ref={ref}
      />
    );
  }

  return (
    <div>
      <ShadCNComponents.Label.Label htmlFor={label}>
        {label}
      </ShadCNComponents.Label.Label>
      <ShadCNComponents.Input.Input
        className={className}
        id={label}
        name={name}
        autoFocus={autoFocus}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onKeyDown={onKeyDown}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    </div>
  );
});
