import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useMergeRefs, useAutoFocus } from "@blocknote/react";
import { forwardRef, useId } from "react";

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
    autoComplete,
    "aria-activedescendant": ariaActivedescendant,
    rightSection, // TODO: add rightSection
    ...rest
  } = props;

  assertEmpty(rest);

  // Rationale (and the trap contract `data-autofocus` serves) in the hook.

  const id = useId();
  const inputRef = useAutoFocus<HTMLInputElement>(autoFocus);
  const setRefs = useMergeRefs([inputRef, ref]);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <div
      className={cn(
        className,
        "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "text-foreground items-center gap-2",
      )}
    >
      {icon}
      <div className="flex-1">
        {label && (
          <ShadCNComponents.Label.Label htmlFor={id}>
            {label}
          </ShadCNComponents.Label.Label>
        )}
        <ShadCNComponents.Input.Input
          className={cn(className, "h-auto border-none p-0")}
          id={id}
          name={name}
          autoComplete={autoComplete}
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
