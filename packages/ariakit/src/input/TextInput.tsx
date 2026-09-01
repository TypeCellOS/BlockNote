import {
  FormInput as AriakitFormInput,
  FormLabel as AriakitFormLabel,
} from "@ariakit/react";

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
          ref={setRefs}
          data-autofocus={autoFocus ? "true" : undefined}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={onKeyDown}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-activedescendant={ariaActivedescendant}
        />
        {rightSection}
      </div>
    </>
  );
});
