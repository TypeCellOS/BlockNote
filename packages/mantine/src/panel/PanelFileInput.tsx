import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelFileInput = forwardRef<
  HTMLButtonElement,
  ComponentProps["ImagePanel"]["FileInput"]
>((props, ref) => {
  const { className, value, placeholder, onChange, ...rest } = props;

  return (
    <Mantine.FileInput
      size={"xs"}
      className={className}
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      {...rest}
    />
  );
});
