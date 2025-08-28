import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

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
          autoFocus={autoFocus}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onSubmit={onSubmit}
          ref={ref}
        />
      </div>
      {rightSection}
    </div>
  );
});
