import * as ShadCNInput from "../components/ui/input";
import { ComponentProps } from "@blocknote/react";

export const PanelFileInput = (
  props: ComponentProps["ImagePanel"]["FileInput"] &
    Partial<{
      Input: typeof ShadCNInput.Input;
    }>
) => {
  const Input = props.Input || ShadCNInput.Input;

  return (
    <Input
      type={"file"}
      value={props.value ? props.value.name : undefined}
      onChange={async (e) => props.onChange?.(e.target.files![0])}
      placeholder={props.placeholder}
    />
  );
};
