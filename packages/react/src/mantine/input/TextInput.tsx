import * as mantine from "@mantine/core";
import { TextInputProps } from "../../editor/ComponentsContext";

export const TextInput = (props: TextInputProps) => {
  const { icon, ...rest } = props;
  return <mantine.TextInput leftSection={icon} size={"xs"} {...rest} />;
};
