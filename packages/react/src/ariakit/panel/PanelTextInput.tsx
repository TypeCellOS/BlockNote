import * as Ariakit from "@ariakit/react";

import { PanelTextInputProps } from "../../editor/ComponentsContext";

export const PanelTextInput = (props: PanelTextInputProps) => {
  const { children, ...rest } = props;

  return (
    <Ariakit.FormProvider>
      <Ariakit.FormInput
        name={"panel-input"}
        className={"input"}
        {...rest}
        data-test={"embed-input"}
      />
    </Ariakit.FormProvider>
  );
};
