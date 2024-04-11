import * as Ariakit from "@ariakit/react";

import { ComponentProps } from "@blocknote/react";

export const TextInput = (
  props: ComponentProps["Generic"]["Form"]["TextInput"]
) => {
  const { icon, ...rest } = props;

  // TODO: support icon
  return (
    <>
      {props.label && (
        <Ariakit.FormLabel name={props.name}>{props.label}</Ariakit.FormLabel>
      )}
      <Ariakit.FormInput {...rest} />
    </>
  );
};
