import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { assertEmpty } from "@blocknote/core";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";
import { cn } from "../lib/utils";

export const PanelTextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["ImagePanel"]["TextInput"]
>((props, ref) => {
  const { className, value, placeholder, onKeyDown, onChange, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Input.Input
      data-test={"embed-input"}
      className={cn(className, "w-80")}
      ref={ref}
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={onChange}
    />
  );
});
