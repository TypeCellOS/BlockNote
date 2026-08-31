import {
  FormInput as AriakitFormInput,
  FormLabel as AriakitFormLabel,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef, useCallback, useEffect, useRef } from "react";

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
    "aria-activedescendant": ariaActivedescendant,
    rightSection,
    ...rest
  } = props;

  assertEmpty(rest);

  // Focus with `preventScroll`, rather than the native `autofocus`: these
  // inputs live in popovers that floating-ui positions *after* mount, so the
  // browser's scroll-into-view runs while the popover is still at its
  // pre-positioned spot and yanks the page (on mobile, right out from under
  // the block being edited).
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setRefs = useCallback(
    (element: HTMLInputElement | null) => {
      inputRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    },
    [ref],
  );
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

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
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onSubmit={onSubmit}
          autoComplete={autoComplete}
          aria-activedescendant={ariaActivedescendant}
        />
        {rightSection}
      </div>
    </>
  );
});
