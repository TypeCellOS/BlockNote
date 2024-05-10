import * as Ariakit from "@ariakit/react";
import { assertEmpty } from "@blocknote/core";

import { ComponentProps } from "@blocknote/react";
import { forwardRef } from "react";

export const PanelFileInput = forwardRef<
  HTMLInputElement,
  ComponentProps["ImagePanel"]["FileInput"]
>((props, ref) => {
  const { className, value, placeholder, onChange, ...rest } = props;

  assertEmpty(rest);

  return (
    <Ariakit.FormProvider>
      <Ariakit.FormInput
        className={className}
        ref={ref}
        name={"panel-input"}
        type={"file"}
        value={value ? value.name : undefined}
        onChange={async (e) => onChange?.(e.target.files![0])}
        placeholder={placeholder}
      />
    </Ariakit.FormProvider>
  );
});
