import { TextInput as MantineTextInput } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useAutoFocus, useMergeRefs } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelTextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["FilePanel"]["TextInput"]
>((props, ref) => {
  const {
    autoFocus,
    className,
    value,
    placeholder,
    onKeyDown,
    onChange,
    ...rest
  } = props;

  assertEmpty(rest);

  const inputRef = useAutoFocus<HTMLInputElement>(autoFocus);
  const mergedRef = useMergeRefs([ref, inputRef]);

  return (
    <MantineTextInput
      size={"xs"}
      data-test={"embed-input"}
      className={className}
      ref={mergedRef}
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={onChange}
    />
  );
});
