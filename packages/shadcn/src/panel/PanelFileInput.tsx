import * as ShadCNInput from "../components/ui/input";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext";

export const PanelFileInput = forwardRef<
  HTMLInputElement,
  ComponentProps["ImagePanel"]["FileInput"]
>((props, ref) => {
  const { className, value, placeholder, onChange } = props;

  const ShadCNComponents = useShadCNComponentsContext();
  const Input = ShadCNComponents?.Input || ShadCNInput.Input;

  return (
    <Input
      type={"file"}
      className={className}
      ref={ref}
      value={value ? value.name : undefined}
      onChange={async (e) => onChange?.(e.target.files![0])}
      placeholder={placeholder}
    />
  );
});
