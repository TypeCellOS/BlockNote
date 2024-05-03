import { ComponentPropsWithoutRef, forwardRef } from "react";
import { Button } from "@mantine/core";

export const FilePanelButton = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<"button">, "size">
>((props, ref) => (
  <Button size={"xs"} {...props} ref={ref} data-test={"embed-input-button"}>
    Embed File
  </Button>
));
