import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { assertEmpty } from "@blocknote/core";
import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const PanelFileInput = forwardRef<
  HTMLInputElement,
  ComponentProps["ImagePanel"]["FileInput"]
>((props, ref) => {
  const { className, value, placeholder, onChange, ...rest } = props;

  assertEmpty(rest);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Input.Input
      type={"file"}
      className={className}
      ref={ref}
      value={value ? value.name : undefined}
      onChange={async (e) => onChange?.(e.target.files![0])}
      placeholder={placeholder}
    />
  );
});
