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
        "bn-flex bn-h-10 bn-w-full bn-rounded-md bn-border bn-border-input bn-bg-background bn-px-3 bn-py-2 bn-text-sm bn-ring-offset-background file:bn-border-0 file:bn-bg-transparent file:bn-text-sm file:bn-font-medium placeholder:bn-text-muted-foreground focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-cursor-not-allowed disabled:bn-opacity-50",
        "bn-items-center bn-gap-2 bn-text-foreground",
      )}
    >
      {icon}
      <div className="bn-flex-1">
        {label && (
          <ShadCNComponents.Label.Label htmlFor={label}>
            {label}
          </ShadCNComponents.Label.Label>
        )}
        <ShadCNComponents.Input.Input
          className={cn(className, "bn-border-none bn-p-0 bn-h-auto")}
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
