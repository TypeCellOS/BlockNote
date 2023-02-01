import { KeyboardEvent } from "react";
import { TextInput } from "@mantine/core";

export type EditHyperlinkMenuItemInputProps = {
  autofocus?: boolean;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function EditHyperlinkMenuItemInput(
  props: EditHyperlinkMenuItemInputProps
) {
  function handleEnter(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      props.onSubmit();
    }
  }

  return (
    <TextInput
      autoFocus={props.autofocus}
      size={"xs"}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
      onKeyDown={handleEnter}
      placeholder={props.placeholder}
    />
  );
}
