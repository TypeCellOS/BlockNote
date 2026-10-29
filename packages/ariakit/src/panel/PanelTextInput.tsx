import {
  FormInput as AriakitFormInput,
  FormProvider as AriakitFormProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
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
    <AriakitFormProvider>
      <AriakitFormInput
        className={mergeCSSClasses("bn-ak-input", className || "")}
        name={"panel-input"}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onKeyDown={onKeyDown}
        data-test={"embed-input"}
        ref={mergedRef}
      />
    </AriakitFormProvider>
  );
});
