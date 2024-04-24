import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelTextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["ImagePanel"]["TextInput"]
>((props, ref) => {
  const { className, value, placeholder, onKeyDown, onChange } = props;

  return (
    <Mantine.TextInput
      size={"xs"}
      data-test={"embed-input"}
      className={className}
      ref={ref}
      value={value}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      onChange={onChange}
    />
  );
});
