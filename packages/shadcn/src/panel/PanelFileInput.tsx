import { Input } from "../components/ui/input";
import { ComponentProps } from "@blocknote/react";

export const PanelFileInput = (
  props: ComponentProps["ImagePanel"]["FileInput"]
) => {
  return (
    <Input
      type={"file"}
      value={props.value ? props.value.name : undefined}
      onChange={async (e) => props.onChange?.(e.target.files![0])}
      placeholder={props.placeholder}
    />
  );
};
