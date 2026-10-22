import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useAutoFocus, useMergeRefs } from "@blocknote/react";
import { forwardRef } from "react";

import { useShadCNComponentsContext } from "../ShadCNComponentsContext.js";

export const PanelFileInput = forwardRef<
  HTMLInputElement,
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

  const inputRef = useAutoFocus<HTMLInputElement>(autoFocus);
  const mergedRef = useMergeRefs([ref, inputRef]);

  const ShadCNComponents = useShadCNComponentsContext()!;

  return (
    <ShadCNComponents.Input.Input
      type={"file"}
      className={className}
      ref={mergedRef}
      accept={accept}
      value={value ? value.name : undefined}
      onChange={async (e) => onChange?.(e.target.files![0])}
      placeholder={placeholder}
    />
  );
});
