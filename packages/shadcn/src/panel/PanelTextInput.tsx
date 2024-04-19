import * as ShadCNInput from "../components/ui/input";

import { ComponentProps } from "@blocknote/react";

export const PanelTextInput = (
  props: ComponentProps["ImagePanel"]["TextInput"] &
    Partial<{
      Input: typeof ShadCNInput.Input;
    }>
) => {
  const { className, value, placeholder, onKeyDown, onChange } = props;

  const Input = props.Input || ShadCNInput.Input;

  return (
    <Input
      data-test={"embed-input"}
      className={className}
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={onChange}
    />
  );
};
