import { KeyboardEvent, useEffect, useRef } from "react";
import { TextInput } from "@mantine/core";

export type HyperlinkMenuInputProps = {
  autofocus?: boolean;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function HyperlinkMenuInput(props: HyperlinkMenuInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      props.autofocus && inputRef.current?.focus();
    }, 0);
  }, [props.autofocus]);

  function handleEnter(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      props.onSubmit();
    }
  }

  return (
    <TextInput
      size={"xs"}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
      onKeyDown={handleEnter}
      placeholder={props.placeholder}
      ref={inputRef}
    />
  );
}
