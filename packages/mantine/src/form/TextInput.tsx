import { TextInput as MantineTextInput } from "@mantine/core";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps, useMergeRefs } from "@blocknote/react";
import { forwardRef, useEffect, useRef } from "react";

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

  // Focus with `preventScroll`, rather than the native `autofocus`: these
  // inputs live in popovers that floating-ui positions *after* mount, so the
  // browser's scroll-into-view runs while the popover is still at its
  // pre-positioned spot and yanks the page (on mobile, right out from under
  // the block being edited).
  //
  // No Mantine focus trap competes with this in the form popovers (Popover's
  // `trapFocus` defaults to false), but trap-active subtrees do exist nearby
  // (the toolbar's Tab-cycling trap; Menu's default trap on desktop) — the
  // `data-autofocus` below makes any such trap pick this same element
  // instead of falling back to "first focusable", so the two mechanisms can
  // never fight over where focus lands.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setRefs = useMergeRefs([inputRef, ref]);
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [autoFocus]);

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
