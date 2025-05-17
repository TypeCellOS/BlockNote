import {
  FormInput as AriakitFormInput,
  FormLabel as AriakitFormLabel,
} from "@ariakit/react";

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
    <>
      {props.label && <AriakitFormLabel name={name}>{label}</AriakitFormLabel>}
      <div className="bn-ak-input-wrapper">
        {icon}
        <AriakitFormInput
          className={mergeCSSClasses(
            "bn-ak-input",
            className || "",
            variant === "large" ? "bn-ak-input-large" : "",
          )}
          ref={ref}
          name={name}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onSubmit={onSubmit}
          autoComplete={autoComplete}
        />
        {rightSection}
      </div>
    </>
  );
});
