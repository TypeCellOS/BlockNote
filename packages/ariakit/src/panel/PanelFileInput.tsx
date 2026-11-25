import {
  FormInput as AriakitFormInput,
  FormProvider as AriakitFormProvider,
} from "@ariakit/react";

import { assertEmpty } from "@blocknote/core";
import { ComponentProps, useAutoFocus, useMergeRefs } from "@blocknote/react";
import { forwardRef, type ChangeEvent } from "react";

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

  return (
    <AriakitFormProvider>
      <AriakitFormInput
        className={className}
        ref={mergedRef}
        name={"panel-input"}
        type={"file"}
        accept={accept}
        value={value ? value.name : undefined}
        onChange={async (e: ChangeEvent<HTMLInputElement>) =>
          onChange?.(e.target.files![0])
        }
        placeholder={placeholder}
      />
    </AriakitFormProvider>
  );
});
