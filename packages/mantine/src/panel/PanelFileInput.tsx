import { FileInput as MantineFileInput } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelFileInput = forwardRef<
  HTMLButtonElement,
  ComponentProps["FilePanel"]["FileInput"]
>((props, ref) => {
  const { className, accept, value, placeholder, onChange, ...rest } = props;

  assertEmpty(rest);

  return (
    <MantineFileInput
      size={"xs"}
      className={className}
      ref={ref}
      accept={accept}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      {...rest}
    />
  );
});
