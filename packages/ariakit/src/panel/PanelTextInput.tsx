import {
  FormInput as AriakitFormInput,
  FormProvider as AriakitFormProvider,
} from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelTextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["FilePanel"]["TextInput"]
>((props, ref) => {
  const { className, value, placeholder, onKeyDown, onChange, ...rest } = props;

  assertEmpty(rest);

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
        ref={ref}
      />
    </AriakitFormProvider>
  );
});
