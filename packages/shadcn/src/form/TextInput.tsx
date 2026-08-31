import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef, useCallback, useEffect, useRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";
import { cn } from "../lib/utils.js";

export const TextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["Generic"]["Form"]["TextInput"]
>((props, ref) => {
  const {
    className,
    name,
    label,
    variant: _variant,
    icon, // TODO: implement
    value,
    autoFocus,
    placeholder,
    disabled,
    onKeyDown,
    onChange,
    autoComplete: _autoComplete,
    "aria-activedescendant": ariaActivedescendant,
    rightSection, // TODO: add rightSection
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

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <div
      className={cn(
        className,
        "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "text-foreground items-center gap-2",
      )}
    >
      {icon}
      <div className="flex-1">
        {label && (
          <ShadCNComponents.Label.Label htmlFor={label}>
            {label}
          </ShadCNComponents.Label.Label>
        )}
        <ShadCNComponents.Input.Input
          className={cn(className, "h-auto border-none p-0")}
          id={label}
          name={name}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onKeyDown={onKeyDown}
          onChange={onChange}
          ref={setRefs}
          aria-activedescendant={ariaActivedescendant}
        />
      </div>
      {rightSection}
    </div>
  );
});
