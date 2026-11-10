import { FileInput as MantineFileInput } from "@mantine/core";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useAutoFocus, useMergeRefs } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelFileInput = forwardRef<
  HTMLButtonElement,
  ComponentProps["FilePanel"]["FileInput"]
>((props, ref) => {
  const {
    autoFocus,
    className,
    accept,
    value,
    placeholder,
    onChange,
    ...rest
  } = props;

  assertEmpty(rest);

  const inputRef = useAutoFocus<HTMLButtonElement>(autoFocus);
  const mergedRef = useMergeRefs([ref, inputRef]);

  return (
    <MantineFileInput
      size={"xs"}
      className={className}
      ref={mergedRef}
      accept={accept}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      {...rest}
    />
  );
});
