import { TextInput } from "@mantine/core";

import { PanelTextInputProps } from "../../editor/ComponentsContext";

export const PanelTextInput = (props: PanelTextInputProps) => {
  const { children, ...rest } = props;

  return <TextInput size={"xs"} {...rest} data-test={"embed-input"} />;
};
