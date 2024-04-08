import { TextInputProps } from "@blocknote/react";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export const TextInput = (props: TextInputProps) => {
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
