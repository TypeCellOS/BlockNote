import { Input } from "../components/ui/input";
import { ComponentProps } from "@blocknote/react";

export const PanelTextInput = (
  props: ComponentProps["ImagePanel"]["TextInput"]
) => {
  const { ...rest } = props;

  return <Input {...rest} data-test={"embed-input"} />;
};
