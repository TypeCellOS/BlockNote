import { Button } from "@mantine/core";

import { PanelButtonProps } from "../../editor/ComponentsContext";

export const PanelButton = (props: PanelButtonProps) => {
  const { children, ...rest } = props;

  return (
    <Button size={"xs"} {...rest}>
      {children}
    </Button>
  );
};
