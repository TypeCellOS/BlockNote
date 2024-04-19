import * as ShadCNInput from "../components/ui/input";

import { ComponentProps } from "@blocknote/react";

export const PanelFileInput = (
  props: ComponentProps["ImagePanel"]["FileInput"] &
    Partial<{
      Input: typeof ShadCNInput.Input;
    }>
) => {
  const { className, value, placeholder, onChange } = props;

  const Input = props.Input || ShadCNInput.Input;

  return (
    <Input
      type={"file"}
      className={className}
      value={value ? value.name : undefined}
      onChange={async (e) => onChange?.(e.target.files![0])}
      placeholder={placeholder}
    />
  );
};
