import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

export const PanelTextInput = (
  props: ComponentProps["ImagePanel"]["TextInput"]
) => {
  const { className, value, placeholder, onKeyDown, onChange } = props;

  return (
    <Ariakit.FormProvider>
      <Ariakit.FormInput
        className={mergeCSSClasses("input", className || "")}
        name={"panel-input"}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onKeyDown={onKeyDown}
        data-test={"embed-input"}
      />
    </Ariakit.FormProvider>
  );
};
