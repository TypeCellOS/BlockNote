import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

export const PanelTextInput = (
  props: ComponentProps["ImagePanel"]["TextInput"]
) => {
  const { className, ...rest } = props;

  return (
    <Ariakit.FormProvider>
      <Ariakit.FormInput
        className={mergeCSSClasses("input", className || "")}
        name={"panel-input"}
        {...rest}
        data-test={"embed-input"}
      />
    </Ariakit.FormProvider>
  );
};
