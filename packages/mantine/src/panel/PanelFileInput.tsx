import * as Mantine from "@mantine/core";

import { PanelFileInputProps } from "@blocknote/react";

export const PanelFileInput = (props: PanelFileInputProps) => (
  <Mantine.FileInput size={"xs"} {...props} />
);
