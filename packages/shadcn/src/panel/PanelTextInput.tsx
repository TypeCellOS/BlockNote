import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useAutoFocus, useMergeRefs } from "@blocknote/react";
import { forwardRef } from "react";

import { cn } from "../lib/utils.js";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const PanelTextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["FilePanel"]["TextInput"]
>((props, ref) => {
  const {
    autoFocus,
    className,
    value,
    placeholder,
    onKeyDown,
    onChange,
    ...rest
  } = props;

  assertEmpty(rest);

  const inputRef = useAutoFocus<HTMLInputElement>(autoFocus);
  const mergedRef = useMergeRefs([ref, inputRef]);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Input.Input
      data-test={"embed-input"}
      className={cn(className, "w-80 max-w-full")}
      ref={mergedRef}
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={onChange}
    />
  );
});
