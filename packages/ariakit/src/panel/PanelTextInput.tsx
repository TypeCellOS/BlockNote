import * as Ariakit from "@ariakit/react";

import { assertEmpty, mergeCSSClasses } from "@blocknote/core";
import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelTextInput = forwardRef<
  HTMLInputElement,
  ComponentProps["ImagePanel"]["TextInput"]
>((props, ref) => {
  const { className, value, placeholder, onKeyDown, onChange, ...rest } = props;

  assertEmpty(rest);

  return (
    <Ariakit.FormProvider>
      <Ariakit.FormInput
        className={mergeCSSClasses("bn-ak-input", className || "")}
        name={"panel-input"}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onKeyDown={onKeyDown}
        data-test={"embed-input"}
        ref={ref}
      />
    </Ariakit.FormProvider>
  );
});
