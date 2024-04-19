import * as ShadCNInput from "../components/ui/input";
import { ComponentProps } from "@blocknote/react";

export const PanelTextInput = (
  props: ComponentProps["ImagePanel"]["TextInput"] &
    Partial<{
      Input: typeof ShadCNInput.Input;
    }>
) => {
  const Input = props.Input || ShadCNInput.Input;

  const { ...rest } = props;

  return <Input {...rest} data-test={"embed-input"} />;
};
