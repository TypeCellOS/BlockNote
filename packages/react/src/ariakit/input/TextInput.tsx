import * as Ariakit from "@ariakit/react";
import { TextInputProps } from "../../editor/ComponentsContext";

export const TextInput = (props: TextInputProps) => {
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
