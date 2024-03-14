import { TextInput } from "@mantine/core";
import { ComponentPropsWithoutRef, forwardRef } from "react";

export const ImagePanelTextInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentPropsWithoutRef<"input">, "size">
>((props, ref) => (
  <TextInput size={"xs"} {...props} ref={ref} data-test={"embed-input"} />
));
