import { ComponentProps } from "@blocknote/react";

import * as ShadCNInput from "../components/ui/input";
import * as ShadCNLabel from "../components/ui/label";

export const TextInput = (
  props: ComponentProps["Generic"]["Form"]["TextInput"] &
    Partial<{
      Input: typeof ShadCNInput.Input;
      Label: typeof ShadCNLabel.Label;
    }>
) => {
  const Input = props.Input || ShadCNInput.Input;
  const Label = props.Label || ShadCNLabel.Label;

  if (!props.label) {
    return (
      <Input
        name={props.name}
        autoFocus={props.autoFocus}
        placeholder={props.placeholder}
        value={props.value}
        onKeyDown={props.onKeyDown}
        onChange={props.onChange}
        onSubmit={props.onSubmit}
      />
    );
  }

  return (
    <div>
      <Label htmlFor={props.label}>{props.label}</Label>
      <Input
        id={props.label}
        name={props.name}
        autoFocus={props.autoFocus}
        placeholder={props.placeholder}
        value={props.value}
        onKeyDown={props.onKeyDown}
        onChange={props.onChange}
        onSubmit={props.onSubmit}
      />
    </div>
  );
};
