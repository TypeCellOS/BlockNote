import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const PanelFileInput = (
  props: ComponentProps["ImagePanel"]["FileInput"]
) => (
  <Ariakit.FormProvider>
    <Ariakit.FormInput
      className={props.className}
      name={"panel-input"}
      type={"file"}
      value={props.value ? props.value.name : undefined}
      onChange={async (e) => props.onChange?.(e.target.files![0])}
      placeholder={props.placeholder}
    />
  </Ariakit.FormProvider>
);
