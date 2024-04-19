import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const PanelFileInput = (
  props: ComponentProps["ImagePanel"]["FileInput"]
) => {
  const { className, value, placeholder, onChange } = props;

  return (
    <Ariakit.FormProvider>
      <Ariakit.FormInput
        className={className}
        name={"panel-input"}
        type={"file"}
        value={value ? value.name : undefined}
        onChange={async (e) => onChange?.(e.target.files![0])}
        placeholder={placeholder}
      />
    </Ariakit.FormProvider>
  );
};
