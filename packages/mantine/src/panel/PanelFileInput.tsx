import * as Mantine from "@mantine/core";

import { ComponentProps } from "@blocknote/react";

export const PanelFileInput = (
  props: ComponentProps["ImagePanel"]["FileInput"]
) => <Mantine.FileInput size={"xs"} {...props} />;
