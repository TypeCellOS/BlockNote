import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";
import { mergeCSSClasses } from "@blocknote/core";

export const TextInput = (
  props: ComponentProps["Generic"]["Form"]["TextInput"]
) => {
  const { className, icon, ...rest } = props;

  // TODO: support icon
  return (
    <>
      {props.label && (
        <Ariakit.FormLabel name={props.name}>{props.label}</Ariakit.FormLabel>
      )}
      <Ariakit.FormInput
        className={mergeCSSClasses("input", className || "")}
        {...rest}
      />
    </>
  );
};
