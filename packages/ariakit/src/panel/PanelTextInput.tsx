import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const PanelTextInput = (
  props: ComponentProps["ImagePanel"]["TextInput"]
) => {
  const { ...rest } = props;

  return (
    <Ariakit.FormProvider>
      <Ariakit.FormInput
        name={"panel-input"}
        {...rest}
        data-test={"embed-input"}
      />
    </Ariakit.FormProvider>
  );
};
